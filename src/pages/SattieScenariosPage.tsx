import { useState } from "react";
import { Button, Callout, Card, Tag } from "@blueprintjs/core";
import { PanelTitle } from "../components/PanelTitle";
import { createUplink, getCommand } from "../lib/sattieApi";
import type { GroundStation, Requestor, Satellite, Scenario } from "../sattie-types";

interface SattieScenariosPageProps {
  canRun: boolean;
  groundStations: GroundStation[];
  onDataChange?: () => Promise<void> | void;
  requestors: Requestor[];
  satellites: Satellite[];
  scenarios: Scenario[];
}

interface ScenarioRunResult {
  commandId: string;
  scenarioId: string;
  scenarioName: string;
  satelliteId: string;
  state: string;
  message: string | null;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getScenarioPayload(scenario: Scenario, satellite: Satellite) {
  const isSar = satellite.type === "SAR";
  const scenarioSeed = Number.parseInt(scenario.scenario_id.replace(/\D/g, ""), 10) || 1;
  const baseLat = 33.5 + ((scenarioSeed % 7) * 0.6);
  const baseLon = 125.5 + ((scenarioSeed % 9) * 0.45);

  return {
    mission_name: scenario.scenario_name,
    aoi_name: scenario.scenario_desc.slice(0, 40),
    aoi_center_lat: baseLat,
    aoi_center_lon: baseLon,
    aoi_bbox: [baseLon - 0.4, baseLat - 0.25, baseLon + 0.4, baseLat + 0.25],
    priority: "URGENT" as const,
    width: isSar ? 1024 : 1280,
    height: isSar ? 1024 : 1280,
    cloud_percent: isSar ? 0 : 18,
    max_cloud_cover_percent: isSar ? null : 30,
    max_off_nadir_deg: isSar ? null : 20,
    min_sun_elevation_deg: isSar ? null : 18,
    incidence_min_deg: isSar ? 20 : null,
    incidence_max_deg: isSar ? 40 : null,
    look_side: "ANY" as const,
    pass_direction: "ANY" as const,
    polarization: isSar ? "VV" : null,
    delivery_method: "DOWNLOAD" as const,
    delivery_path: null,
    generation_mode: "EXTERNAL" as const,
    external_map_source: "OSM" as const,
    external_map_zoom: 16,
    fail_probability: 0.03,
  };
}

export function SattieScenariosPage({
  canRun,
  groundStations,
  onDataChange,
  requestors,
  satellites,
  scenarios,
}: SattieScenariosPageProps) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScenarioRunResult[]>([]);

  const passCount = results.filter((item) => item.state === "DOWNLINK_READY").length;
  const failCount = results.filter((item) => item.state === "FAILED").length;

  async function runScenario(scenario: Scenario) {
    setRunningId(scenario.scenario_id);
    setError(null);

    try {
      const satellite =
        scenario.satellite_system_ids
          .map((id) => satellites.find((item) => item.satellite_id === id))
          .find(Boolean) ?? null;

      if (satellite == null) {
        throw new Error(`No matching satellite found for ${scenario.scenario_id}`);
      }

      const primaryGroundStation = groundStations[0] ?? null;
      const primaryRequestor =
        primaryGroundStation != null
          ? requestors.find((item) => item.ground_station_id === primaryGroundStation.ground_station_id) ?? null
          : null;

      const uplink = await createUplink({
        satellite_id: satellite.satellite_id,
        ground_station_id: primaryGroundStation?.ground_station_id ?? null,
        requestor_id: primaryRequestor?.requestor_id ?? null,
        ...getScenarioPayload(scenario, satellite),
      });

      let finalState = uplink.state;
      let finalMessage: string | null = null;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        await delay(700);
        const command = await getCommand(uplink.command_id);
        finalState = command.state;
        finalMessage = command.message;
        if (command.state === "DOWNLINK_READY" || command.state === "FAILED") {
          break;
        }
      }

      setResults((current) => [
        {
          commandId: uplink.command_id,
          scenarioId: scenario.scenario_id,
          scenarioName: scenario.scenario_name,
          satelliteId: satellite.satellite_id,
          state: finalState,
          message: finalMessage,
        },
        ...current,
      ]);
      await onDataChange?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Scenario run failed");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div className="page-intro__copy">
          <p className="eyebrow">Multi Payload Scenario</p>
          <h1>Scenario Regression Runner</h1>
          <p className="page-copy">
            자가검증 목적으로 시나리오 카탈로그를 실행해 uplink 생성과 최종 상태를 확인한다.
            결과는 pass/fail 기준으로 누적된다.
          </p>
        </div>
        <Card className="mini-summary">
          <div className="mini-summary__grid">
            <div>
              <strong>{scenarios.length}</strong>
              <span>catalog scenarios</span>
            </div>
            <div>
              <strong>{passCount}</strong>
              <span>pass</span>
            </div>
            <div>
              <strong>{failCount}</strong>
              <span>fail</span>
            </div>
          </div>
        </Card>
      </section>

      {error ? (
        <Callout icon="error" intent="danger">
          {error}
        </Callout>
      ) : null}

      {!canRun ? (
        <Callout icon="lock" intent="warning">
          현재 역할에서는 scenario 실행이 비활성화된다.
        </Callout>
      ) : null}

      <section className="detail-grid">
        <Card className="panel">
          <div className="panel__title-row">
            <PanelTitle icon="grid-view">Scenario Buttons</PanelTitle>
            <Tag minimal intent="primary">
              Run
            </Tag>
          </div>
          <div className="button-cluster">
            {scenarios.map((scenario) => (
              <Button
                className="scenario-button"
                key={scenario.scenario_id}
                intent="success"
                loading={runningId === scenario.scenario_id}
                disabled={!canRun}
                onClick={() => void runScenario(scenario)}
              >
                {scenario.scenario_id}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="panel">
          <div className="panel__title-row">
            <PanelTitle icon="comparison">Execution Summary</PanelTitle>
            <Tag minimal intent="success">
              Live
            </Tag>
          </div>
          <div className="simple-list">
            <div className="simple-list__item">
              <div>
                <strong>Ground Station Binding</strong>
                <p>{groundStations[0]?.name ?? "No ground station available"}</p>
              </div>
              <Tag minimal>{groundStations[0]?.ground_station_id ?? "-"}</Tag>
            </div>
            <div className="simple-list__item">
              <div>
                <strong>Requestor Binding</strong>
                <p>{requestors[0]?.name ?? "No requestor available"}</p>
              </div>
              <Tag minimal>{requestors[0]?.requestor_id ?? "-"}</Tag>
            </div>
            <div className="simple-list__item">
              <div>
                <strong>Result Counter</strong>
                <p>DOWNLINK_READY = pass, FAILED = fail</p>
              </div>
              <Tag minimal intent={failCount > 0 ? "warning" : "success"}>
                {results.length} runs
              </Tag>
            </div>
          </div>
        </Card>
      </section>

      <Card className="panel">
        <div className="panel__title-row">
          <PanelTitle icon="properties">Scenario Catalog</PanelTitle>
          <Tag minimal intent="primary">
            A12
          </Tag>
        </div>
        <div className="simple-list">
          {scenarios.map((scenario) => (
            <div key={scenario.scenario_id} className="simple-list__item">
              <div>
                <strong>
                  {scenario.scenario_id} · {scenario.scenario_name}
                </strong>
                <p>{scenario.scenario_desc}</p>
              </div>
              <Tag minimal>{scenario.satellite_system_ids.join(", ")}</Tag>
            </div>
          ))}
        </div>
      </Card>

      <Card className="panel">
        <div className="panel__title-row">
          <PanelTitle icon="history">Recent Results</PanelTitle>
          <Tag minimal intent="warning">
            Pass {passCount} / Fail {failCount}
          </Tag>
        </div>
        <div className="simple-list">
          {results.length === 0 ? (
            <p className="page-copy page-copy--tight">No scenario has been executed yet.</p>
          ) : (
            results.map((result) => (
              <div key={`${result.scenarioId}-${result.commandId}`} className="simple-list__item">
                <div>
                  <strong>
                    {result.scenarioId} · {result.scenarioName}
                  </strong>
                  <p>
                    {result.commandId} · {result.satelliteId} · {result.message ?? "-"}
                  </p>
                </div>
                <Tag minimal intent={result.state === "DOWNLINK_READY" ? "success" : "danger"}>
                  {result.state}
                </Tag>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Button, Callout, Card, HTMLTable, Icon, Spinner, Tag } from "@blueprintjs/core";
import { PanelTitle } from "../components/PanelTitle";
import { getCommands } from "../lib/sattieApi";
import type { CommandStatus, Satellite } from "../sattie-types";

interface SattiePerformancePageProps {
  satellites: Satellite[];
}

interface SatelliteReportRow {
  avgProcSeconds: string;
  failed: number;
  inProgress: number;
  lastCaptureAt: string | null;
  name: string;
  ready: number;
  satelliteId: string;
  status: string;
  successRate: string;
  topGroundStation: string;
  total: number;
  type: string;
}

type PerformanceSortKey =
  | "name"
  | "type"
  | "status"
  | "total"
  | "ready"
  | "failed"
  | "inProgress"
  | "successRate"
  | "avgProcSeconds"
  | "lastCaptureAt"
  | "topGroundStation";

type SortDirection = "asc" | "desc";

function buildSatelliteReportRows(
  satellites: Satellite[],
  commands: CommandStatus[],
): SatelliteReportRow[] {
  const statsBySatelliteId = new Map<
    string,
    {
      durations: number[];
      failed: number;
      groundStationCount: Record<string, number>;
      inProgress: number;
      lastCaptureAt: string | null;
      name: string;
      ready: number;
      satelliteId: string;
      status: string;
      total: number;
      type: string;
    }
  >();

  for (const satellite of satellites) {
    statsBySatelliteId.set(satellite.satellite_id, {
      satelliteId: satellite.satellite_id,
      name: satellite.name,
      type: satellite.type,
      status: satellite.status,
      total: 0,
      ready: 0,
      failed: 0,
      inProgress: 0,
      durations: [],
      lastCaptureAt: null,
      groundStationCount: {},
    });
  }

  for (const command of commands) {
    const stats = statsBySatelliteId.get(command.satellite_id) ?? {
      satelliteId: command.satellite_id,
      name: command.satellite_id,
      type: command.satellite_type,
      status: "-",
      total: 0,
      ready: 0,
      failed: 0,
      inProgress: 0,
      durations: [],
      lastCaptureAt: null,
      groundStationCount: {},
    };

    stats.total += 1;
    if (command.state === "DOWNLINK_READY") {
      stats.ready += 1;
    } else if (command.state === "FAILED") {
      stats.failed += 1;
    } else {
      stats.inProgress += 1;
    }

    if (
      command.created_at &&
      command.updated_at &&
      (command.state === "DOWNLINK_READY" || command.state === "FAILED")
    ) {
      const created = Date.parse(command.created_at);
      const updated = Date.parse(command.updated_at);
      if (Number.isFinite(created) && Number.isFinite(updated) && updated >= created) {
        stats.durations.push((updated - created) / 1000);
      }
    }

    const capturedAt = String(command.acquisition_metadata?.captured_at ?? "");
    if (capturedAt && (!stats.lastCaptureAt || Date.parse(capturedAt) > Date.parse(stats.lastCaptureAt))) {
      stats.lastCaptureAt = capturedAt;
    }

    const stationName = command.ground_station_name || "(none)";
    stats.groundStationCount[stationName] = (stats.groundStationCount[stationName] ?? 0) + 1;
    statsBySatelliteId.set(command.satellite_id, stats);
  }

  return Array.from(statsBySatelliteId.values())
    .map((stats) => {
      const terminalCount = stats.ready + stats.failed;
      const topGroundStation =
        Object.entries(stats.groundStationCount).sort((a, b) => b[1] - a[1])[0] ?? null;

      return {
        satelliteId: stats.satelliteId,
        name: stats.name,
        type: stats.type,
        status: stats.status,
        total: stats.total,
        ready: stats.ready,
        failed: stats.failed,
        inProgress: stats.inProgress,
        successRate: terminalCount > 0 ? `${((stats.ready / terminalCount) * 100).toFixed(1)}%` : "-",
        avgProcSeconds: stats.durations.length
          ? (stats.durations.reduce((sum, value) => sum + value, 0) / stats.durations.length).toFixed(2)
          : "-",
        lastCaptureAt: stats.lastCaptureAt,
        topGroundStation: topGroundStation ? `${topGroundStation[0]} (${topGroundStation[1]})` : "-",
      };
    })
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      return a.name.localeCompare(b.name, "ko");
    });
}

export function SattiePerformancePage({ satellites }: SattiePerformancePageProps) {
  const [commands, setCommands] = useState<CommandStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<PerformanceSortKey>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  async function refreshReport() {
    setLoading(true);
    setError(null);

    try {
      const nextCommands = await getCommands();
      setCommands(nextCommands);
      setGeneratedAt(new Date().toLocaleString("ko-KR"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Performance report load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshReport();
  }, []);

  const reportRows = useMemo(
    () => buildSatelliteReportRows(satellites, commands),
    [commands, satellites],
  );
  const sortedReportRows = useMemo(() => {
    const rows = reportRows.slice();
    const direction = sortDirection === "asc" ? 1 : -1;

    const getComparableValue = (row: SatelliteReportRow) => {
      switch (sortKey) {
        case "name":
        case "type":
        case "status":
        case "topGroundStation":
          return row[sortKey];
        case "total":
        case "ready":
        case "failed":
        case "inProgress":
          return row[sortKey];
        case "successRate":
          return row.successRate === "-" ? -1 : Number.parseFloat(row.successRate);
        case "avgProcSeconds":
          return row.avgProcSeconds === "-" ? -1 : Number.parseFloat(row.avgProcSeconds);
        case "lastCaptureAt": {
          const parsed = row.lastCaptureAt ? Date.parse(row.lastCaptureAt) : Number.NaN;
          return Number.isFinite(parsed) ? parsed : -1;
        }
        default:
          return row.name;
      }
    };

    rows.sort((left, right) => {
      const leftValue = getComparableValue(left);
      const rightValue = getComparableValue(right);

      if (typeof leftValue === "string" && typeof rightValue === "string") {
        const compared = leftValue.localeCompare(rightValue, "ko");
        return compared === 0 ? left.name.localeCompare(right.name, "ko") : compared * direction;
      }

      const safeLeft = typeof leftValue === "number" ? leftValue : -1;
      const safeRight = typeof rightValue === "number" ? rightValue : -1;

      if (safeLeft === safeRight) {
        return left.name.localeCompare(right.name, "ko");
      }

      return (safeLeft - safeRight) * direction;
    });

    return rows;
  }, [reportRows, sortDirection, sortKey]);
  const readyTotal = reportRows.reduce((sum, row) => sum + row.ready, 0);
  const failedTotal = reportRows.reduce((sum, row) => sum + row.failed, 0);
  const best = reportRows[0] ?? null;

  function handleSort(nextSortKey: PerformanceSortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "name" || nextSortKey === "type" || nextSortKey === "status" ? "asc" : "desc");
  }

  function renderSortHeader(label: string, key: PerformanceSortKey) {
    const isActive = sortKey === key;
    const icon = !isActive ? "sort" : sortDirection === "asc" ? "sort-asc" : "sort-desc";

    return (
      <button type="button" className={`sort-header ${isActive ? "is-active" : ""}`} onClick={() => handleSort(key)}>
        <span>{label}</span>
        <Icon icon={icon} size={12} />
      </button>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div className="page-intro__copy">
          <p className="eyebrow">Satellites Performance</p>
          <h1>Satellite Imaging Performance Statistics</h1>
          <p className="page-copy">
            위성별 Uplink 수행, 다운링크결과를 모사하는 리포트로 집계하는 화면이다.
          </p>
        </div>
        <Card className="mini-summary">
          {loading ? (
            <div className="panel-loading">
              <Spinner size={22} />
              <span>report loading</span>
            </div>
          ) : (
            <div className="mini-summary__grid">
              <div>
                <strong>{reportRows.length}</strong>
                <span>satellites</span>
              </div>
              <div>
                <strong>{commands.length}</strong>
                <span>commands</span>
              </div>
              <div>
                <strong>{readyTotal}</strong>
                <span>downlink ready</span>
              </div>
            </div>
          )}
        </Card>
      </section>

      {error ? (
        <Callout icon="error" intent="danger">
          {error}
        </Callout>
      ) : null}

      <Card className="panel panel--report-summary">
        <div className="panel__title-row">
          <PanelTitle icon="chart">Report Summary</PanelTitle>
          <div className="button-cluster">
            <Tag minimal intent="primary">
              {generatedAt ? `Generated at: ${generatedAt}` : "No report generated."}
            </Tag>
            <Button icon="refresh" onClick={() => void refreshReport()} loading={loading}>
              Refresh Report
            </Button>
          </div>
        </div>
        <Callout icon="timeline-bar-chart" intent="primary">
          {reportRows.length
            ? `Satellites: ${reportRows.length}, Commands: ${commands.length}, Ready: ${readyTotal}, Failed: ${failedTotal}${best ? `, Most Active: ${best.name}(${best.total})` : ""}`
            : "No command data."}
        </Callout>
      </Card>

      <Card className="panel">
        <div className="panel__title-row">
          <PanelTitle icon="th">Satellite Performance Table</PanelTitle>
          <Tag minimal intent="success">
            Report
          </Tag>
        </div>
        <HTMLTable bordered interactive striped className="data-table">
          <thead>
            <tr>
              <th>{renderSortHeader("Satellite", "name")}</th>
              <th>{renderSortHeader("Type", "type")}</th>
              <th>{renderSortHeader("Status", "status")}</th>
              <th>{renderSortHeader("Total", "total")}</th>
              <th>{renderSortHeader("Ready", "ready")}</th>
              <th>{renderSortHeader("Failed", "failed")}</th>
              <th>{renderSortHeader("In Progress", "inProgress")}</th>
              <th>{renderSortHeader("Success Rate", "successRate")}</th>
              <th>{renderSortHeader("Avg Proc(s)", "avgProcSeconds")}</th>
              <th>{renderSortHeader("Last Capture At", "lastCaptureAt")}</th>
              <th>{renderSortHeader("Top Ground Station", "topGroundStation")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedReportRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="subtle-text">
                  No report data.
                </td>
              </tr>
            ) : (
              sortedReportRows.map((row) => (
                <tr key={row.satelliteId}>
                  <td>{row.name}</td>
                  <td>{row.type}</td>
                  <td>{row.status}</td>
                  <td>{row.total}</td>
                  <td>{row.ready}</td>
                  <td>{row.failed}</td>
                  <td>{row.inProgress}</td>
                  <td>{row.successRate}</td>
                  <td>{row.avgProcSeconds}</td>
                  <td>{row.lastCaptureAt ?? "-"}</td>
                  <td>{row.topGroundStation}</td>
                </tr>
              ))
            )}
          </tbody>
        </HTMLTable>
      </Card>
    </div>
  );
}

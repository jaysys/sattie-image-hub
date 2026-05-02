import { useEffect, useMemo, useState } from "react";
import { Button, Callout, Card, Classes, Dialog, HTMLTable, Icon, Spinner, Tag } from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";
import { PanelTitle } from "../components/PanelTitle";
import { SattieOrbitTrackCanvas } from "../components/SattieOrbitTrackCanvas";
import { useOrbitTrackScene } from "../hooks/useOrbitTrackScene";
import { useI18n } from "../i18n";
import { getCommands, getGroundStations, getSattieHealth } from "../lib/sattieApi";
import type { CommandState, CommandStatus, SattieConsoleBootstrap, SattieHealthResponse } from "../sattie-types";

const dashboardHeroImage = "/k-sattie-sky-hub.jpg";

interface SattieDashboardPageProps {
  bootstrap: SattieConsoleBootstrap;
  darkMode: boolean;
}

function formatKstDateTime(value: string | null | undefined, locale: string) {
  if (!value) {
    return "-";
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(parsed));
}

function getIntent(state: CommandState) {
  switch (state) {
    case "DOWNLINK_READY":
      return "success";
    case "FAILED":
      return "danger";
    case "ACCESSING_AOI":
    case "CAPTURING":
      return "warning";
    default:
      return "primary";
  }
}

export function SattieDashboardPage({ bootstrap, darkMode }: SattieDashboardPageProps) {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [health, setHealth] = useState<SattieHealthResponse>(bootstrap.health);
  const [commands, setCommands] = useState<CommandStatus[]>([]);
  const [groundStationCount, setGroundStationCount] = useState(bootstrap.groundStations.length);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastHealthStatus, setLastHealthStatus] = useState<number | null>(null);
  const [lastHealthPayload, setLastHealthPayload] = useState<SattieHealthResponse | null>(null);
  const [heroOpen, setHeroOpen] = useState(false);
  const { visibleEntries, visibleLeoBackdropPoints, summary } = useOrbitTrackScene(bootstrap.satellites);

  const commandSummary = useMemo(() => {
    const summary = {
      total: commands.length,
      ready: 0,
      failed: 0,
      queued: 0,
      acked: 0,
      accessingAoi: 0,
      capturing: 0,
    };

    for (const command of commands) {
      if (command.state === "DOWNLINK_READY") summary.ready += 1;
      else if (command.state === "FAILED") summary.failed += 1;
      else if (command.state === "QUEUED") summary.queued += 1;
      else if (command.state === "ACKED") summary.acked += 1;
      else if (command.state === "ACCESSING_AOI") summary.accessingAoi += 1;
      else if (command.state === "CAPTURING") {
        summary.capturing += 1;
      }
    }

    return summary;
  }, [commands]);

  const stateRows: Array<{ label: string; value: number; intent: "primary" | "success" | "warning" | "danger" }> = [
    { label: "ACKED", value: commandSummary.acked, intent: "primary" },
    { label: "QUEUED", value: commandSummary.queued, intent: "primary" },
    { label: t("dashboard.distribution.accessingAoi"), value: commandSummary.accessingAoi, intent: "primary" },
    { label: "CAPTURING", value: commandSummary.capturing, intent: "warning" },
    { label: "DOWNLINK_READY", value: commandSummary.ready, intent: "success" },
    { label: "FAILED", value: commandSummary.failed, intent: "danger" },
  ];

  const completedCommands = useMemo(
    () => commands.slice().sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))),
    [commands],
  );

  const completedSummary = useMemo(() => {
    const ready = completedCommands.filter((command) => command.state === "DOWNLINK_READY" && command.download_url).length;
    const failed = completedCommands.filter((command) => command.state === "FAILED").length;
    const inProgress = completedCommands.filter((command) =>
      ["QUEUED", "ACKED", "ACCESSING_AOI", "CAPTURING"].includes(command.state),
    ).length;
    return t("dashboard.completedLinks.summary", {
      total: completedCommands.length,
      ready,
      failed,
      inProgress,
    });
  }, [completedCommands, t]);

  const latestCompletedCommands = useMemo(() => completedCommands.slice(0, 10), [completedCommands]);

  const healthMessage = useMemo(() => {
    if (!lastHealthStatus || !lastHealthPayload) {
      return t("dashboard.healthIdle");
    }

    return t("dashboard.healthStatus", {
      status: lastHealthStatus,
      payload: JSON.stringify(lastHealthPayload),
    });
  }, [lastHealthPayload, lastHealthStatus, t]);

  async function refreshDashboard() {
    const [nextCommands, nextGroundStations] = await Promise.all([
      getCommands(),
      getGroundStations(),
    ]);
    setCommands(nextCommands);
    setGroundStationCount(nextGroundStations.length);
    setHealth((current) => ({
      ...current,
      counts: {
        ...current.counts,
        commands: nextCommands.length,
        groundStations: nextGroundStations.length,
      },
    }));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        await refreshDashboard();
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : t("errors.dashboardRefreshFailed"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleHealthCheck() {
    setRefreshing(true);
    setError(null);

    try {
      const nextHealth = await getSattieHealth();
      setHealth(nextHealth);
      setLastHealthStatus(200);
      setLastHealthPayload(nextHealth);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("errors.healthCheckFailed"));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-intro page-intro--dashboard">
        <div className="page-intro__copy">
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>{t("dashboard.title")}</h1>
          <p className="page-copy">
            {t("dashboard.description")}
          </p>
        </div>
        <Card className="dashboard-hero-card dashboard-hero-card--floating">
          <div className="dashboard-hero-card__head">
            <Tag minimal intent="primary">
              {t("dashboard.heroTag")}
            </Tag>
          </div>
          <button type="button" className="dashboard-hero-wrap" onClick={() => setHeroOpen(true)}>
            <img className="dashboard-hero" src={dashboardHeroImage} alt={t("dashboard.heroAlt")} />
          </button>
        </Card>
      </section>

      {error ? (
        <Callout icon="error" intent="danger">
          {error}
        </Callout>
      ) : null}

      <section className="dashboard-top-grid">
        <div className="dashboard-top-grid__main">
          <Card className="panel dashboard-top-grid__panel">
            <div className="panel__title-row">
              <PanelTitle icon="home">{t("dashboard.quickCheckTitle")}</PanelTitle>
              <Tag minimal intent="primary">
                {t("dashboard.quickCheckTag")}
              </Tag>
            </div>
            <div className="button-cluster">
              <Button icon="pulse" intent="primary" loading={refreshing} onClick={() => void handleHealthCheck()}>
                {t("dashboard.healthCheck")}
              </Button>
            </div>
            {loading ? (
              <div className="panel-loading">
                <Spinner size={22} />
                <span>{t("dashboard.healthLoading")}</span>
              </div>
            ) : (
              <Callout icon="info-sign" intent={health.ok ? "success" : "primary"} className="stack-actions">
                {healthMessage}
              </Callout>
            )}
          </Card>

          <section className="metric-grid dashboard-top-grid__row dashboard-metric-grid dashboard-metric-grid--double">
            <Card
              className="metric-card kpi-nav-card"
              interactive
              onClick={() => navigate("/satellites#satellite-registry")}
            >
              <span className="metric-card__label">
                <Icon icon="satellite" />
                <span>{t("dashboard.metrics.satellites")}</span>
              </span>
              <strong>{health.counts.satellites}</strong>
              <Tag minimal intent="primary">
                {t("dashboard.metrics.configuration")}
              </Tag>
            </Card>
            <Card
              className="metric-card kpi-nav-card"
              interactive
              onClick={() => navigate("/satellites#ground-station-registry")}
            >
              <span className="metric-card__label">
                <Icon icon="antenna" />
                <span>{t("dashboard.metrics.groundStations")}</span>
              </span>
              <strong>{groundStationCount}</strong>
              <Tag minimal intent="warning">
                {t("dashboard.metrics.requestors", { count: health.counts.requestors })}
              </Tag>
            </Card>
          </section>

          <section className="metric-grid dashboard-top-grid__row dashboard-metric-grid dashboard-metric-grid--triple">
            <Card className="metric-card kpi-nav-card" interactive onClick={() => navigate("/commands")}>
              <span className="metric-card__label">
                <Icon icon="send-to-graph" />
                <span>{t("dashboard.metrics.uplinkCommands")}</span>
              </span>
              <strong>{commandSummary.total}</strong>
              <Tag minimal intent="primary">
                {t("dashboard.metrics.commands")}
              </Tag>
            </Card>
            <Card className="metric-card kpi-nav-card" interactive onClick={() => navigate("/commands")}>
              <span className="metric-card__label">
                <Icon icon="download" />
                <span>{t("dashboard.metrics.downlinkReady")}</span>
              </span>
              <strong>{commandSummary.ready}</strong>
              <Tag minimal intent="success">
                {t("dashboard.metrics.completed")}
              </Tag>
            </Card>
            <Card className="metric-card kpi-nav-card" interactive onClick={() => navigate("/commands")}>
              <span className="metric-card__label">
                <Icon icon="warning-sign" />
                <span>{t("dashboard.metrics.failed")}</span>
              </span>
              <strong>{commandSummary.failed}</strong>
              <Tag minimal intent={commandSummary.failed > 0 ? "danger" : "success"}>
                {t("dashboard.metrics.attention")}
              </Tag>
            </Card>
          </section>
        </div>

        <Card
          className="panel dashboard-orbit-preview-card"
          interactive
          role="button"
          tabIndex={0}
          onClick={() => navigate("/orbit-track")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigate("/orbit-track");
            }
          }}
        >
          <div className="panel__title-row">
            <PanelTitle icon="globe-network">{t("dashboard.orbitPreview.title")}</PanelTitle>
            <Tag minimal intent="success">
              {t("dashboard.orbitPreview.koreanSatellites", { count: summary.koreanLiveCount })}
            </Tag>
          </div>
          <div className="dashboard-orbit-preview-card__canvas">
            <SattieOrbitTrackCanvas
              entries={visibleEntries}
              backdropPoints={visibleLeoBackdropPoints}
              selectedNorad={null}
              onSelect={() => {}}
              interactive={false}
              showNavigation={false}
              className="orbit-track-globe-shell--dashboard"
              showLabels={false}
            />
          </div>
          <div className="dashboard-orbit-preview-card__footer">
            <span>{t("dashboard.orbitPreview.snapshot")}</span>
            <span>{t("dashboard.orbitPreview.openFull")}</span>
          </div>
        </Card>
      </section>

      <Card className="panel">
        <div className="panel__title-row">
          <PanelTitle icon="heat-grid">{t("dashboard.distribution.title")}</PanelTitle>
          <Tag minimal intent="primary">
            {t("dashboard.distribution.tag")}
          </Tag>
        </div>
        <div className="distribution-list">
          {stateRows.map((row) => {
            const ratio = commandSummary.total > 0 ? row.value / commandSummary.total : 0;

            return (
              <div key={row.label} className="distribution-list__item">
                <div className="distribution-list__header">
                  <strong>{row.label}</strong>
                  <Tag minimal intent={row.intent}>
                    {row.value}
                  </Tag>
                </div>
                <div className="distribution-list__track">
                  <div
                    className={`distribution-list__bar is-${row.intent}`}
                    style={{ width: `${Math.max(ratio * 100, row.value > 0 ? 6 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="panel">
        <div className="panel__title-row">
          <PanelTitle icon="media">{t("dashboard.completedLinks.title")}</PanelTitle>
          <div className="button-cluster">
            <Tag minimal intent="primary">
              {completedSummary}
            </Tag>
            <Button icon="refresh" onClick={() => void refreshDashboard()} loading={loading}>
              {t("common.refresh")}
            </Button>
          </div>
        </div>
        <HTMLTable bordered interactive striped className="data-table">
          <thead>
            <tr>
              <th>{t("dashboard.completedLinks.table.commandId")}</th>
              <th>{t("dashboard.completedLinks.table.satelliteName")}</th>
              <th>{t("dashboard.completedLinks.table.imageCreatedAt")}</th>
              <th>{t("dashboard.completedLinks.table.missionName")}</th>
              <th>{t("dashboard.completedLinks.table.aoiName")}</th>
              <th>{t("dashboard.completedLinks.table.groundStation")}</th>
              <th>{t("dashboard.completedLinks.table.requestorId")}</th>
              <th>{t("dashboard.completedLinks.table.state")}</th>
              <th>{t("dashboard.completedLinks.table.downlink")}</th>
            </tr>
          </thead>
          <tbody>
            {completedCommands.length === 0 ? (
              <tr>
                <td colSpan={9} className="subtle-text">
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              latestCompletedCommands.map((command) => (
                <tr key={command.command_id}>
                  <td>{command.command_id}</td>
                  <td>{bootstrap.satellites.find((item) => item.satellite_id === command.satellite_id)?.name ?? command.satellite_id}</td>
                  <td>{formatKstDateTime(String(command.acquisition_metadata?.captured_at ?? command.updated_at ?? ""), locale)}</td>
                  <td>{command.mission_name || t("common.none")}</td>
                  <td>{command.aoi_name || t("common.none")}</td>
                  <td>{command.ground_station_name || command.ground_station_id || t("common.none")}</td>
                  <td>{command.requestor_id || t("common.none")}</td>
                  <td>
                    <Tag minimal intent={getIntent(command.state)}>
                      {command.state}
                    </Tag>
                  </td>
                  <td>
                    {command.download_url ? (
                      <div className="downlink-cell">
                        <a href={command.download_url} target="_blank" rel="noreferrer">
                          <img
                            className="downlink-thumb"
                            src={command.download_url}
                            alt={t("dashboard.completedLinks.thumbnailAlt")}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        </a>
                        <a href={command.download_url} target="_blank" rel="noreferrer">
                          {t("dashboard.completedLinks.download")}
                        </a>
                      </div>
                    ) : command.state === "FAILED" ? (
                      <span className="text-danger">FAILED</span>
                    ) : (
                      <span className="subtle-text">{t("common.notReady")}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </HTMLTable>
      </Card>

      <Dialog
        isOpen={heroOpen}
        onClose={() => setHeroOpen(false)}
        title={t("dashboard.heroTag")}
        className={`hero-dialog ${darkMode ? Classes.DARK : ""}`}
      >
        <div className="bp6-dialog-body">
          <img className="dashboard-hero dashboard-hero-full" src={dashboardHeroImage} alt={t("dashboard.heroAlt")} />
        </div>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  AnchorButton,
  Button,
  Callout,
  Card,
  Classes,
  Dialog,
  HTMLSelect,
  Icon,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Spinner,
  Switch,
  Tag,
} from "@blueprintjs/core";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PanelTitle } from "./components/PanelTitle";
import { useI18n } from "./i18n";
import { getSattieBootstrap } from "./lib/sattieApi";
import { SattieCommandsPage } from "./pages/SattieCommandsPage";
import { SattieDashboardPage } from "./pages/SattieDashboardPage";
import { SattieOrbitTrackPage } from "./pages/SattieOrbitTrackPage";
import { SattiePerformancePage } from "./pages/SattiePerformancePage";
import { SattiePayloadMonitoringPage } from "./pages/SattiePayloadMonitoringPage";
import { SattieSatellitesPage } from "./pages/SattieSatellitesPage";
import { SattieScenariosPage } from "./pages/SattieScenariosPage";
import { SattieUplinkPage } from "./pages/SattieUplinkPage";
import type { SattieConsoleBootstrap } from "./sattie-types";

type MockRole = "admin" | "operator" | "requestor";

export function App() {
  const location = useLocation();
  const { locale, setLocale, t } = useI18n();
  const [darkMode, setDarkMode] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bootstrap, setBootstrap] = useState<SattieConsoleBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<MockRole>(() => {
    const savedRole = window.localStorage.getItem("simMockUserId");
    return savedRole === "admin" || savedRole === "operator" || savedRole === "requestor"
      ? savedRole
      : "admin";
  });
  const [operationsOpen, setOperationsOpen] = useState(() => {
    const savedState = window.localStorage.getItem("sattieOperationsOpen");
    return savedState == null ? true : savedState === "true";
  });

  async function refreshBootstrap() {
    try {
      setError(null);
      const data = await getSattieBootstrap();
      setBootstrap(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("errors.bootstrapLoadFailed"));
    }
  }

  useEffect(() => {
    let cancelled = false;

    refreshBootstrap()
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("simMockUserId", role);
  }, [role]);

  useEffect(() => {
    window.localStorage.setItem("sattieOperationsOpen", String(operationsOpen));
  }, [operationsOpen]);

  const canAccessSatellites = role === "admin";
  const canSendUplink = role !== "requestor";
  const canRunScenarios = role !== "requestor";
  const canManageInfra = role === "admin";
  const operationsRoutes = ["/uplink", "/commands", "/scenarios"];
  const operationsActive = operationsRoutes.some((route) => location.pathname.startsWith(route));
  const canSeeOperationsGroup = canSendUplink || canRunScenarios;

  return (
    <div className={`app-shell ${darkMode ? Classes.DARK : ""}`}>
      <div className="app-backdrop" />
      <main className="app-frame">
        <Navbar className="topbar">
          <NavbarGroup align="left" className="topbar__brand">
            <NavbarHeading>
              <NavLink to="/dashboard" className="brand-title" end>
                <span className="brand-mark" aria-hidden="true">
                  <Icon icon="satellite" />
                </span>
                <span className="brand-copy">
                  <span className="brand-kicker">{t("app.brand.kicker")}</span>
                  <span className="brand-name">{t("app.brand.name")}</span>
                </span>
              </NavLink>
            </NavbarHeading>
            <NavbarDivider />
            <Tag minimal round large>
              jhojoo@LG
            </Tag>
          </NavbarGroup>
          <NavbarGroup align="right" className="topbar__actions">
            <Button minimal icon="satellite" />
            <Button minimal icon="database" />
            <HTMLSelect
              value={role}
              onChange={(event) => setRole(event.target.value as MockRole)}
              options={[
                { label: t("app.role.admin"), value: "admin" },
                { label: t("app.role.operator"), value: "operator" },
                { label: t("app.role.requestor"), value: "requestor" },
              ]}
            />
            <Switch
              checked={locale === "en"}
              label={`${t("app.language.ko")} / ${t("app.language.en")}`}
              onChange={() => setLocale(locale === "ko" ? "en" : "ko")}
            />
            <Switch
              checked={darkMode}
              label={t("app.topbar.dark")}
              onChange={() => setDarkMode((current) => !current)}
            />
            <Button icon="layout-auto" intent="primary" onClick={() => setDialogOpen(true)}>
              {t("app.topbar.structure")}
            </Button>
          </NavbarGroup>
        </Navbar>

        <section className="workspace-layout">
          <aside className="sidebar-stack">
            <Card className="panel panel--sidebar">
              <div className="panel__title-row">
                <PanelTitle icon="map">{t("app.nav.consoleMap")}</PanelTitle>
                <Tag minimal intent="primary">
                  {t("app.nav.router")}
                </Tag>
              </div>
              <nav className="rail-links" aria-label={t("app.nav.primary")}>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `rail-link ${isActive ? "is-active" : ""}`}
                >
                  <span className="rail-link__title">
                    <Icon icon="dashboard" />
                    <span>{t("app.nav.dashboard")}</span>
                  </span>
                </NavLink>
                <NavLink
                  to="/orbit-track"
                  className={({ isActive }) => `rail-link ${isActive ? "is-active" : ""}`}
                >
                  <span className="rail-link__title">
                    <Icon icon="globe-network" />
                    <span>{t("app.nav.orbitTrack")}</span>
                  </span>
                  <span className="rail-link__meta">{t("app.nav.orbitTrackMeta")}</span>
                </NavLink>
                {canAccessSatellites ? (
                  <NavLink
                    to="/satellites"
                    className={({ isActive }) => `rail-link ${isActive ? "is-active" : ""}`}
                  >
                    <span className="rail-link__title">
                      <Icon icon="satellite" />
                      <span>{t("app.nav.satellites")}</span>
                    </span>
                    <span className="rail-link__meta">{t("app.nav.satellitesMeta")}</span>
                  </NavLink>
                ) : null}
                <NavLink
                  to="/performance"
                  className={({ isActive }) => `rail-link ${isActive ? "is-active" : ""}`}
                >
                  <span className="rail-link__title">
                    <Icon icon="timeline-area-chart" />
                    <span>{t("app.nav.performance")}</span>
                  </span>
                </NavLink>
                <NavLink
                  to="/payload-monitoring"
                  className={({ isActive }) => `rail-link ${isActive ? "is-active" : ""}`}
                >
                  <span className="rail-link__title">
                    <Icon icon="data-connection" />
                    <span>{t("app.nav.payloadMonitoring")}</span>
                  </span>
                </NavLink>
                {canSeeOperationsGroup ? (
                  <div className={`rail-group ${operationsOpen ? "is-open" : ""} ${operationsActive ? "is-active" : ""}`}>
                    <button
                      type="button"
                      className={`rail-group__trigger ${operationsOpen || operationsActive ? "is-active" : ""}`}
                      aria-expanded={operationsOpen}
                      onClick={() => setOperationsOpen((current) => !current)}
                    >
                      <span className="rail-group__copy">
                        <span className="rail-link__title">
                          <Icon icon="pulse" />
                          <span>{t("app.nav.selfDiagnostics")}</span>
                        </span>
                      </span>
                      <span className="rail-group__chevron">{operationsOpen ? "▾" : "▸"}</span>
                    </button>
                    {operationsOpen ? (
                      <div className="rail-group__items">
                        {canSendUplink ? (
                          <NavLink
                            to="/uplink"
                            className={({ isActive }) => `rail-link rail-link--child ${isActive ? "is-active" : ""}`}
                          >
                            <span className="rail-link__title">
                              <Icon icon="send-to-graph" />
                              <span>{t("app.nav.uplink")}</span>
                            </span>
                            <span className="rail-link__meta">{t("app.nav.uplinkMeta")}</span>
                          </NavLink>
                        ) : null}
                        {canRunScenarios ? (
                          <NavLink
                            to="/scenarios"
                            className={({ isActive }) => `rail-link rail-link--child ${isActive ? "is-active" : ""}`}
                          >
                            <span className="rail-link__title">
                              <Icon icon="projects" />
                              <span>{t("app.nav.scenarios")}</span>
                            </span>
                          </NavLink>
                        ) : null}
                        <NavLink
                          to="/commands"
                          className={({ isActive }) => `rail-link rail-link--child ${isActive ? "is-active" : ""}`}
                        >
                          <span className="rail-link__title">
                            <Icon icon="search-template" />
                            <span>{t("app.nav.commands")}</span>
                          </span>
                        </NavLink>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </nav>
            </Card>

            <Card className="panel panel--sidebar">
              <div className="panel__title-row">
                <PanelTitle icon="time">{t("app.runtime.title")}</PanelTitle>
                <Tag minimal intent="success">
                  {t("app.runtime.apiTag")}
                </Tag>
              </div>
              {loading ? (
                <div className="panel-loading">
                  <Spinner size={22} />
                  <span>{t("app.runtime.loading")}</span>
                </div>
              ) : error ? (
                <Callout icon="error" intent="danger">
                  {error}
                </Callout>
              ) : bootstrap ? (
                <>
                  <div className="tag-row">
                    <Tag minimal>React</Tag>
                    <Tag minimal>Blueprint</Tag>
                    <Tag minimal>Express</Tag>
                    <Tag minimal>SQLite</Tag>
                    <Tag minimal intent="primary">
                      {role}
                    </Tag>
                  </div>
                  <div className="console-facts">
                    <div className="console-facts__item">
                      <span>{t("app.runtime.service")}</span>
                      <strong>{bootstrap.health.service}</strong>
                    </div>
                    <div className="console-facts__item">
                      <span>{t("app.runtime.db")}</span>
                      <strong>{bootstrap.health.sqliteVersion}</strong>
                    </div>
                    <div className="console-facts__item">
                      <span>{t("app.runtime.commands")}</span>
                      <strong>{bootstrap.health.counts.commands}</strong>
                    </div>
                  </div>
                  <Callout icon="data-connection" intent="primary">
                    {t("app.runtime.migrated")}
                  </Callout>
                  {!canAccessSatellites ? (
                    <Callout icon="lock" intent="warning">
                      {role === "operator"
                        ? t("app.runtime.operatorRestricted")
                        : t("app.runtime.requestorRestricted")}
                    </Callout>
                  ) : null}
                </>
              ) : null}
            </Card>
          </aside>

          <section className="content-stack">
            {loading ? (
              <Card className="panel panel--loading">
                <div className="panel-loading">
                  <Spinner />
                  <span>{t("app.topbar.loading")}</span>
                </div>
              </Card>
            ) : error ? (
              <Card className="panel panel--loading">
                <Callout icon="error" intent="danger">
                  {error}
                </Callout>
              </Card>
            ) : bootstrap ? (
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={<SattieDashboardPage bootstrap={bootstrap} darkMode={darkMode} />}
                />
                <Route
                  path="/satellites"
                  element={
                    canAccessSatellites ? (
                      <SattieSatellitesPage
                        darkMode={darkMode}
                        satellites={bootstrap.satellites}
                        groundStations={bootstrap.groundStations}
                        requestors={bootstrap.requestors}
                        canManage={canManageInfra}
                        onDataChange={refreshBootstrap}
                      />
                    ) : (
                      <Navigate to="/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="/orbit-track"
                  element={
                    <SattieOrbitTrackPage
                      satellites={bootstrap.satellites}
                      canSendUplink={canSendUplink}
                    />
                  }
                />
                <Route
                  path="/performance"
                  element={<SattiePerformancePage satellites={bootstrap.satellites} />}
                />
                <Route path="/payload-monitoring" element={<SattiePayloadMonitoringPage />} />
                <Route
                  path="/uplink"
                  element={
                    canSendUplink ? (
                      <SattieUplinkPage
                        satellites={bootstrap.satellites}
                        groundStations={bootstrap.groundStations}
                        requestors={bootstrap.requestors}
                        canSend={canSendUplink}
                        onCommandCreated={refreshBootstrap}
                      />
                    ) : (
                      <Navigate to="/commands" replace />
                    )
                  }
                />
                <Route
                  path="/commands"
                  element={
                    <SattieCommandsPage
                      satellites={bootstrap.satellites}
                      onDataChange={refreshBootstrap}
                    />
                  }
                />
                <Route
                  path="/scenarios"
                  element={
                    canRunScenarios ? (
                      <SattieScenariosPage
                        scenarios={bootstrap.scenarios}
                        satellites={bootstrap.satellites}
                        groundStations={bootstrap.groundStations}
                        requestors={bootstrap.requestors}
                        canRun={canRunScenarios}
                        onDataChange={refreshBootstrap}
                      />
                    ) : (
                      <Navigate to="/commands" replace />
                    )
                  }
                />
              </Routes>
            ) : null}
          </section>
        </section>
      </main>

      <Dialog
        icon="dashboard"
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={t("app.dialog.title")}
      >
        <div className={Classes.DIALOG_BODY}>
          <ol className="dialog-list">
            <li>{t("app.dialog.items.api")}</li>
            <li>{t("app.dialog.items.routes")}</li>
            <li>{t("app.dialog.items.roles")}</li>
          </ol>
          <div className="dialog-docs">
            <div className="dialog-docs__header">
              <strong>{t("app.dialog.docsTitle")}</strong>
              <span className="subtle-text">{t("app.dialog.docsHelp")}</span>
            </div>
            <div className="dialog-docs__actions">
              <AnchorButton
                href="/api/sattie/docs"
                target="_blank"
                rel="noreferrer"
                icon="document-open"
                intent="primary"
              >
                {t("app.dialog.swagger")}
              </AnchorButton>
              <AnchorButton
                href="/api/sattie/redoc"
                target="_blank"
                rel="noreferrer"
                icon="manual"
              >
                {t("app.dialog.redoc")}
              </AnchorButton>
            </div>
          </div>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={() => setDialogOpen(false)}>{t("common.close")}</Button>
            <Button intent="primary" onClick={() => setDialogOpen(false)}>
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

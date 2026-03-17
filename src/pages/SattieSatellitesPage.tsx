import { useEffect, useRef, useState } from "react";
import {
  Button,
  Callout,
  Card,
  Dialog,
  FormGroup,
  HTMLSelect,
  HTMLTable,
  InputGroup,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import { useLocation } from "react-router-dom";
import { PanelTitle } from "../components/PanelTitle";
import {
  createGroundStation,
  createRequestor,
  createSatellite,
  deleteGroundStation,
  deleteRequestor,
  deleteSatellite,
  getGroundStations,
  getRequestors,
  getSatelliteTypes,
  getSatellites,
  seedMockGroundStations,
  seedMockRequestors,
  seedMockSatellites,
  updateGroundStation,
  updateRequestor,
  updateSatellite,
} from "../lib/sattieApi";
import type {
  GroundStation,
  GroundStationStatus,
  GroundStationType,
  Requestor,
  Satellite,
  SatelliteStatus,
  SatelliteType,
  SatelliteTypeProfilesResponse,
} from "../sattie-types";

interface SattieSatellitesPageProps {
  canManage: boolean;
  groundStations: GroundStation[];
  onDataChange?: () => Promise<void> | void;
  requestors: Requestor[];
  satellites: Satellite[];
}

export function SattieSatellitesPage({
  canManage,
  groundStations: initialGroundStations,
  onDataChange,
  requestors: initialRequestors,
  satellites: initialSatellites,
}: SattieSatellitesPageProps) {
  const location = useLocation();
  const satelliteRegistryRef = useRef<HTMLDivElement | null>(null);
  const groundStationRegistryRef = useRef<HTMLDivElement | null>(null);
  const [satellites, setSatellites] = useState(initialSatellites);
  const [groundStations, setGroundStations] = useState(initialGroundStations);
  const [requestors, setRequestors] = useState(initialRequestors);
  const [satelliteTypes, setSatelliteTypes] = useState<SatelliteTypeProfilesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typesDialogOpen, setTypesDialogOpen] = useState(false);
  const [editingSatelliteId, setEditingSatelliteId] = useState<string | null>(null);
  const [editingGroundStationId, setEditingGroundStationId] = useState<string | null>(null);
  const [editingRequestorId, setEditingRequestorId] = useState<string | null>(null);

  const [satelliteForm, setSatelliteForm] = useState({
    name: "",
    type: "EO_OPTICAL" as SatelliteType,
    status: "AVAILABLE" as SatelliteStatus,
  });
  const [groundStationForm, setGroundStationForm] = useState({
    name: "",
    type: "FIXED" as GroundStationType,
    status: "OPERATIONAL" as GroundStationStatus,
    location: "",
  });
  const [requestorForm, setRequestorForm] = useState({
    name: "",
    ground_station_id: "",
  });

  useEffect(() => {
    setSatellites(initialSatellites);
  }, [initialSatellites]);

  useEffect(() => {
    setGroundStations(initialGroundStations);
    setRequestorForm((current) => ({
      ...current,
      ground_station_id: initialGroundStations.some(
        (item) => item.ground_station_id === current.ground_station_id,
      )
        ? current.ground_station_id
        : initialGroundStations[0]?.ground_station_id || "",
    }));
  }, [initialGroundStations]);

  useEffect(() => {
    setRequestors(initialRequestors);
  }, [initialRequestors]);

  useEffect(() => {
    let cancelled = false;

    async function loadResources() {
      setLoading(true);
      setError(null);

      try {
        const [nextSatellites, nextGroundStations, nextRequestors] = await Promise.all([
          getSatellites(),
          getGroundStations(),
          getRequestors(),
        ]);
        if (cancelled) {
          return;
        }
        setSatellites(nextSatellites);
        setGroundStations(nextGroundStations);
        setRequestors(nextRequestors);
        setRequestorForm((current) => ({
          ...current,
          ground_station_id: current.ground_station_id || nextGroundStations[0]?.ground_station_id || "",
        }));
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Resource loading failed");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadResources();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const ref =
      location.hash === "#satellite-registry"
        ? satelliteRegistryRef
        : location.hash === "#ground-station-registry"
          ? groundStationRegistryRef
          : null;

    if (!ref?.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash]);

  async function refreshResources() {
    const [nextSatellites, nextGroundStations, nextRequestors] = await Promise.all([
      getSatellites(),
      getGroundStations(),
      getRequestors(),
    ]);
    setSatellites(nextSatellites);
    setGroundStations(nextGroundStations);
    setRequestors(nextRequestors);
    setRequestorForm((current) => ({
      ...current,
      ground_station_id: nextGroundStations.some((item) => item.ground_station_id === current.ground_station_id)
        ? current.ground_station_id
        : nextGroundStations[0]?.ground_station_id || "",
    }));
  }

  async function runAction(action: () => Promise<void>, successMessage: string) {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await action();
      await refreshResources();
      await onDataChange?.();
      setMessage(successMessage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const editingSatellite =
    editingSatelliteId != null
      ? satellites.find((item) => item.satellite_id === editingSatelliteId) ?? null
      : null;
  const editingGroundStation =
    editingGroundStationId != null
      ? groundStations.find((item) => item.ground_station_id === editingGroundStationId) ?? null
      : null;
  const editingRequestor =
    editingRequestorId != null
      ? requestors.find((item) => item.requestor_id === editingRequestorId) ?? null
      : null;

  async function handleSeedSatellites() {
    await runAction(async () => {
      await seedMockSatellites();
    }, "Mock satellites seeded.");
  }

  async function handleSeedGroundStations() {
    await runAction(async () => {
      await seedMockGroundStations();
    }, "Mock ground stations seeded.");
  }

  async function handleSeedRequestors() {
    await runAction(async () => {
      await seedMockRequestors();
    }, "Mock requestors seeded.");
  }

  async function handleShowSatelliteTypes() {
    setBusy(true);
    setError(null);
    try {
      setSatelliteTypes(await getSatelliteTypes());
      setTypesDialogOpen(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Satellite types load failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSatellite() {
    await runAction(async () => {
      await createSatellite(satelliteForm);
      setSatelliteForm({
        name: "",
        type: "EO_OPTICAL",
        status: "AVAILABLE",
      });
    }, "Satellite created.");
  }

  async function handleCreateGroundStation() {
    await runAction(async () => {
      await createGroundStation({
        ...groundStationForm,
        location: groundStationForm.location.trim() || null,
      });
      setGroundStationForm({
        name: "",
        type: "FIXED",
        status: "OPERATIONAL",
        location: "",
      });
    }, "Ground station created.");
  }

  async function handleCreateRequestor() {
    await runAction(async () => {
      await createRequestor(requestorForm);
      setRequestorForm((current) => ({ ...current, name: "" }));
    }, "Requestor created.");
  }

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div className="page-intro__copy">
          <p className="eyebrow">Satellites</p>
          <h1>Resource Management Console</h1>
          <p className="page-copy">
            PoC 용도로 필요한 위성정보, 지상국정보, 사용자 정보 Seeding, 생성, 수정,
            삭제를 통해 위성 자원과 지상국 네트워크를 검증하는 화면이다.
          </p>
        </div>
        <Card className="mini-summary">
          <div className="mini-summary__grid">
            <div>
              <strong>{satellites.length}</strong>
              <span>satellites</span>
            </div>
            <div>
              <strong>{groundStations.length}</strong>
              <span>ground stations</span>
            </div>
            <div>
              <strong>{requestors.length}</strong>
              <span>requestors</span>
            </div>
          </div>
        </Card>
      </section>

      {error ? (
        <Callout icon="error" intent="danger">
          {error}
        </Callout>
      ) : null}

      {message ? (
        <Callout icon="info-sign" intent="success">
          {message}
        </Callout>
      ) : null}

      <section className="detail-grid detail-grid--compact-left">
        <Card className="panel" ref={satelliteRegistryRef}>
          <div className="panel__title-row">
            <PanelTitle icon="database">Resource Status</PanelTitle>
            <Tag minimal intent="success">
              Live
            </Tag>
          </div>
          {loading ? (
            <div className="panel-loading">
              <Spinner size={22} />
              <span>resource loading</span>
            </div>
          ) : (
            <div className="simple-list">
              <div className="simple-list__item">
                <div>
                  <strong>Satellites</strong>
                  <p>{satellites.filter((item) => item.status === "AVAILABLE").length} available</p>
                </div>
                <Tag minimal intent="success">
                  {satellites.length}
                </Tag>
              </div>
              <div className="simple-list__item">
                <div>
                  <strong>Ground Stations</strong>
                  <p>{groundStations.filter((item) => item.status === "OPERATIONAL").length} operational</p>
                </div>
                <Tag minimal intent="primary">
                  {groundStations.length}
                </Tag>
              </div>
              <div className="simple-list__item">
                <div>
                  <strong>Requestors</strong>
                  <p>network-linked requestor identities</p>
                </div>
                <Tag minimal intent="warning">
                  {requestors.length}
                </Tag>
              </div>
            </div>
          )}
        </Card>

        <Card className="panel panel--resource-status">
          <div className="panel__title-row">
            <PanelTitle icon="endorsed">Seed Actions for PoC</PanelTitle>
            <Tag minimal intent="primary">
              API
            </Tag>
          </div>
          <div className="button-cluster">
            <Button loading={busy} onClick={handleSeedSatellites}>
              Setup Initial Mock Satellites
            </Button>
            <Button loading={busy} disabled={!canManage} onClick={handleSeedGroundStations}>
              Setup Initial Mock Ground Stations
            </Button>
            <Button loading={busy} disabled={!canManage} onClick={handleSeedRequestors}>
              Setup Initial Mock Requestors
            </Button>
            <Button loading={busy} onClick={handleShowSatelliteTypes}>
              Show Satellite Types Available
            </Button>
          </div>
          {!canManage ? (
            <Callout icon="lock" intent="warning" className="stack-actions">
              현재 모드에서는 생성/수정/삭제 같은 인프라 관리 기능을 사용할 수 없다.
            </Callout>
          ) : null}
        </Card>
      </section>

      <section className="uplink-grid uplink-grid--triple resource-create-grid">
        <Card className="panel panel--seed-actions">
          <div className="panel__title-row">
            <PanelTitle icon="satellite">Create Satellite</PanelTitle>
            <Tag minimal intent="success">
              Form
            </Tag>
          </div>
          <div className="form-stack">
            <FormGroup label="Name">
              <InputGroup
                value={satelliteForm.name}
                onValueChange={(value) => setSatelliteForm((current) => ({ ...current, name: value }))}
              />
            </FormGroup>
            <div className="form-inline">
              <FormGroup label="Type">
                <HTMLSelect
                  fill
                  value={satelliteForm.type}
                  onChange={(event) =>
                    setSatelliteForm((current) => ({
                      ...current,
                      type: event.target.value as SatelliteType,
                    }))
                  }
                  options={[
                    { label: "EO_OPTICAL", value: "EO_OPTICAL" },
                    { label: "SAR", value: "SAR" },
                  ]}
                />
              </FormGroup>
              <FormGroup label="Status">
                <HTMLSelect
                  fill
                  value={satelliteForm.status}
                  onChange={(event) =>
                    setSatelliteForm((current) => ({
                      ...current,
                      status: event.target.value as SatelliteStatus,
                    }))
                  }
                  options={[
                    { label: "AVAILABLE", value: "AVAILABLE" },
                    { label: "MAINTENANCE", value: "MAINTENANCE" },
                  ]}
                />
              </FormGroup>
            </div>
            <Button intent="primary" loading={busy} disabled={!canManage} onClick={handleCreateSatellite}>
              Create Satellite
            </Button>
          </div>
        </Card>

        <Card className="panel">
          <div className="panel__title-row">
            <PanelTitle icon="antenna">Create Ground Station</PanelTitle>
            <Tag minimal intent="primary">
              Form
            </Tag>
          </div>
          <div className="form-stack">
            <FormGroup label="Name">
              <InputGroup
                value={groundStationForm.name}
                onValueChange={(value) =>
                  setGroundStationForm((current) => ({ ...current, name: value }))
                }
              />
            </FormGroup>
            <FormGroup label="Location">
              <InputGroup
                value={groundStationForm.location}
                onValueChange={(value) =>
                  setGroundStationForm((current) => ({ ...current, location: value }))
                }
              />
            </FormGroup>
            <div className="form-inline">
              <FormGroup label="Type">
                <HTMLSelect
                  fill
                  value={groundStationForm.type}
                  onChange={(event) =>
                    setGroundStationForm((current) => ({
                      ...current,
                      type: event.target.value as GroundStationType,
                    }))
                  }
                  options={[
                    { label: "FIXED", value: "FIXED" },
                    { label: "LAND_MOBILE", value: "LAND_MOBILE" },
                    { label: "MARITIME", value: "MARITIME" },
                    { label: "AIRBORNE", value: "AIRBORNE" },
                  ]}
                />
              </FormGroup>
              <FormGroup label="Status">
                <HTMLSelect
                  fill
                  value={groundStationForm.status}
                  onChange={(event) =>
                    setGroundStationForm((current) => ({
                      ...current,
                      status: event.target.value as GroundStationStatus,
                    }))
                  }
                  options={[
                    { label: "OPERATIONAL", value: "OPERATIONAL" },
                    { label: "MAINTENANCE", value: "MAINTENANCE" },
                  ]}
                />
              </FormGroup>
            </div>
            <Button intent="primary" loading={busy} disabled={!canManage} onClick={handleCreateGroundStation}>
              Create Ground Station
            </Button>
          </div>
        </Card>

        <Card className="panel">
          <div className="panel__title-row">
            <PanelTitle icon="user">Create Requestor</PanelTitle>
            <Tag minimal intent="warning">
              Form
            </Tag>
          </div>
          <div className="form-stack">
            <FormGroup label="Name">
              <InputGroup
                value={requestorForm.name}
                onValueChange={(value) =>
                  setRequestorForm((current) => ({ ...current, name: value }))
                }
              />
            </FormGroup>
            <FormGroup label="Ground Station">
              <HTMLSelect
                fill
                value={requestorForm.ground_station_id}
                onChange={(event) =>
                  setRequestorForm((current) => ({
                    ...current,
                    ground_station_id: event.target.value,
                  }))
                }
                options={groundStations.map((item) => ({
                  label: `${item.ground_station_id} · ${item.name}`,
                  value: item.ground_station_id,
                }))}
              />
            </FormGroup>
            <Button
              intent="primary"
              loading={busy}
              disabled={groundStations.length === 0 || !canManage}
              onClick={handleCreateRequestor}
            >
              Create Requestor
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <Card className="panel">
          <div className="panel__title-row">
            <PanelTitle icon="edit">Update Selected</PanelTitle>
            <Tag minimal intent="success">
              Dialog
            </Tag>
          </div>
          <p className="page-copy page-copy--tight">
            각 테이블의 `Edit` 링크를 누르면 수정 다이얼로그가 열린다. 삭제는 즉시 서버에
            반영된다.
          </p>
        </Card>
      </section>

      <section>
        <Card className="panel">
          <div className="panel__title-row">
            <PanelTitle icon="satellite">Satellites</PanelTitle>
            <Tag minimal intent="success">
              A08
            </Tag>
          </div>
          <div className="table-wrap">
            <HTMLTable bordered interactive striped className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Profile</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {satellites.map((satellite) => (
                  <tr key={satellite.satellite_id}>
                    <td>{satellite.satellite_id}</td>
                    <td>{satellite.name}</td>
                    <td>{satellite.type}</td>
                    <td>
                      <span className={satellite.status === "AVAILABLE" ? "text-success" : "text-danger"}>
                        {satellite.status}
                      </span>
                    </td>
                    <td>{satellite.profile.default_product_type}</td>
                    <td>
                      <div className="action-row">
                        <Button minimal small onClick={() => setEditingSatelliteId(satellite.satellite_id)}>
                          Edit
                        </Button>
                        <Button
                          minimal
                          small
                          intent="danger"
                          loading={busy}
                          disabled={!canManage}
                          onClick={() =>
                            runAction(
                              async () => {
                                await deleteSatellite(satellite.satellite_id);
                              },
                              `Deleted satellite ${satellite.satellite_id}.`,
                            )
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </HTMLTable>
          </div>
        </Card>
      </section>

      <Card className="panel" ref={groundStationRegistryRef}>
        <div className="panel__title-row">
          <PanelTitle icon="git-branch">Ground Station</PanelTitle>
          <Tag minimal intent="warning">
            A08
          </Tag>
        </div>
        <div className="table-wrap">
          <HTMLTable bordered interactive striped className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groundStations.map((station) => (
                <tr key={station.ground_station_id}>
                  <td>{station.ground_station_id}</td>
                  <td>{station.name}</td>
                  <td>{station.type}</td>
                  <td>
                    <span
                      className={station.status === "OPERATIONAL" ? "text-success" : "text-danger"}
                    >
                      {station.status}
                    </span>
                  </td>
                  <td>{station.location ?? "-"}</td>
                  <td>
                    <div className="action-row">
                      <Button
                        minimal
                        small
                        disabled={!canManage}
                        onClick={() => setEditingGroundStationId(station.ground_station_id)}
                      >
                        Edit
                      </Button>
                      <Button
                        minimal
                        small
                        intent="danger"
                        loading={busy}
                        disabled={!canManage}
                        onClick={() =>
                          runAction(
                            async () => {
                              await deleteGroundStation(station.ground_station_id);
                            },
                            `Deleted ground station ${station.ground_station_id}.`,
                          )
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        </div>
      </Card>

      <Card className="panel">
        <div className="panel__title-row">
          <PanelTitle icon="people">Requestors</PanelTitle>
          <Tag minimal intent="warning">
            Table
          </Tag>
        </div>
        <div className="table-wrap">
          <HTMLTable bordered interactive striped className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Ground Station</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requestors.map((requestor) => (
                <tr key={requestor.requestor_id}>
                  <td>{requestor.requestor_id}</td>
                  <td>{requestor.name}</td>
                  <td>
                    {requestor.ground_station_id}
                    <br />
                    <span className="subtle-text">{requestor.ground_station_name ?? "-"}</span>
                  </td>
                  <td>
                    <div className="action-row">
                      <Button minimal small onClick={() => setEditingRequestorId(requestor.requestor_id)}>
                        Edit
                      </Button>
                      <Button
                        minimal
                        small
                        intent="danger"
                        loading={busy}
                        disabled={!canManage}
                        onClick={() =>
                          runAction(
                            async () => {
                              await deleteRequestor(requestor.requestor_id);
                            },
                            `Deleted requestor ${requestor.requestor_id}.`,
                          )
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        </div>
      </Card>

      <Dialog
        isOpen={typesDialogOpen}
        title="Satellite Types Available"
        onClose={() => setTypesDialogOpen(false)}
      >
        <div className="bp6-dialog-body">
          <HTMLTable bordered striped className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Platform</th>
                <th>Product</th>
                <th>Bands/Pol</th>
              </tr>
            </thead>
            <tbody>
              {satelliteTypes
                ? Object.entries(satelliteTypes).map(([type, profile]) => (
                    <tr key={type}>
                      <td>{type}</td>
                      <td>{profile.platform}</td>
                      <td>{profile.default_product_type}</td>
                      <td>{profile.default_bands_or_polarization.join(", ")}</td>
                    </tr>
                  ))
                : null}
            </tbody>
          </HTMLTable>
        </div>
      </Dialog>

      <EditSatelliteDialog
        satellite={editingSatellite}
        busy={busy}
        onClose={() => setEditingSatelliteId(null)}
        onSave={(payload) =>
          canManage
            ? runAction(
            async () => {
              if (editingSatellite == null) {
                return;
              }
              await updateSatellite(editingSatellite.satellite_id, payload);
              setEditingSatelliteId(null);
            },
            "Satellite updated.",
            )
            : Promise.resolve()
        }
      />

      <EditGroundStationDialog
        groundStation={editingGroundStation}
        busy={busy}
        onClose={() => setEditingGroundStationId(null)}
        onSave={(payload) =>
          canManage
            ? runAction(
            async () => {
              if (editingGroundStation == null) {
                return;
              }
              await updateGroundStation(editingGroundStation.ground_station_id, payload);
              setEditingGroundStationId(null);
            },
            "Ground station updated.",
            )
            : Promise.resolve()
        }
      />

      <EditRequestorDialog
        requestor={editingRequestor}
        groundStations={groundStations}
        busy={busy}
        onClose={() => setEditingRequestorId(null)}
        onSave={(payload) =>
          canManage
            ? runAction(
            async () => {
              if (editingRequestor == null) {
                return;
              }
              await updateRequestor(editingRequestor.requestor_id, payload);
              setEditingRequestorId(null);
            },
            "Requestor updated.",
            )
            : Promise.resolve()
        }
      />
    </div>
  );
}

interface EditSatelliteDialogProps {
  busy: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; type: SatelliteType; status: SatelliteStatus }) => Promise<void>;
  satellite: Satellite | null;
}

function EditSatelliteDialog({ satellite, onClose, onSave, busy }: EditSatelliteDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SatelliteType>("EO_OPTICAL");
  const [status, setStatus] = useState<SatelliteStatus>("AVAILABLE");

  useEffect(() => {
    if (!satellite) {
      return;
    }
    setName(satellite.name);
    setType(satellite.type);
    setStatus(satellite.status);
  }, [satellite]);

  return (
    <Dialog isOpen={satellite != null} title="Edit Satellite" onClose={onClose}>
      <div className="bp6-dialog-body form-stack">
        <FormGroup label="Name">
          <InputGroup value={name} onValueChange={setName} />
        </FormGroup>
        <FormGroup label="Type">
          <HTMLSelect
            fill
            value={type}
            onChange={(event) => setType(event.target.value as SatelliteType)}
            options={[
              { label: "EO_OPTICAL", value: "EO_OPTICAL" },
              { label: "SAR", value: "SAR" },
            ]}
          />
        </FormGroup>
        <FormGroup label="Status">
          <HTMLSelect
            fill
            value={status}
            onChange={(event) => setStatus(event.target.value as SatelliteStatus)}
            options={[
              { label: "AVAILABLE", value: "AVAILABLE" },
              { label: "MAINTENANCE", value: "MAINTENANCE" },
            ]}
          />
        </FormGroup>
        <div className="dialog-actions">
          <Button onClick={onClose}>Close</Button>
          <Button intent="primary" loading={busy} onClick={() => void onSave({ name, type, status })}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

interface EditGroundStationDialogProps {
  busy: boolean;
  groundStation: GroundStation | null;
  onClose: () => void;
  onSave: (payload: { name: string; status: GroundStationStatus; location: string | null }) => Promise<void>;
}

function EditGroundStationDialog({
  groundStation,
  onClose,
  onSave,
  busy,
}: EditGroundStationDialogProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<GroundStationStatus>("OPERATIONAL");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!groundStation) {
      return;
    }
    setName(groundStation.name);
    setStatus(groundStation.status);
    setLocation(groundStation.location ?? "");
  }, [groundStation]);

  return (
    <Dialog isOpen={groundStation != null} title="Edit Ground Station" onClose={onClose}>
      <div className="bp6-dialog-body form-stack">
        <FormGroup label="Name">
          <InputGroup value={name} onValueChange={setName} />
        </FormGroup>
        <FormGroup label="Status">
          <HTMLSelect
            fill
            value={status}
            onChange={(event) => setStatus(event.target.value as GroundStationStatus)}
            options={[
              { label: "OPERATIONAL", value: "OPERATIONAL" },
              { label: "MAINTENANCE", value: "MAINTENANCE" },
            ]}
          />
        </FormGroup>
        <FormGroup label="Location">
          <InputGroup value={location} onValueChange={setLocation} />
        </FormGroup>
        <div className="dialog-actions">
          <Button onClick={onClose}>Close</Button>
          <Button
            intent="primary"
            loading={busy}
            onClick={() => void onSave({ name, status, location: location.trim() || null })}
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

interface EditRequestorDialogProps {
  busy: boolean;
  groundStations: GroundStation[];
  onClose: () => void;
  onSave: (payload: { name: string; ground_station_id: string }) => Promise<void>;
  requestor: Requestor | null;
}

function EditRequestorDialog({
  requestor,
  groundStations,
  onClose,
  onSave,
  busy,
}: EditRequestorDialogProps) {
  const [name, setName] = useState("");
  const [groundStationId, setGroundStationId] = useState("");

  useEffect(() => {
    if (!requestor) {
      return;
    }
    setName(requestor.name);
    setGroundStationId(requestor.ground_station_id);
  }, [requestor]);

  return (
    <Dialog isOpen={requestor != null} title="Edit Requestor" onClose={onClose}>
      <div className="bp6-dialog-body form-stack">
        <FormGroup label="Name">
          <InputGroup value={name} onValueChange={setName} />
        </FormGroup>
        <FormGroup label="Ground Station">
          <HTMLSelect
            fill
            value={groundStationId}
            onChange={(event) => setGroundStationId(event.target.value)}
            options={groundStations.map((item) => ({
              label: `${item.ground_station_id} · ${item.name}`,
              value: item.ground_station_id,
            }))}
          />
        </FormGroup>
        <div className="dialog-actions">
          <Button onClick={onClose}>Close</Button>
          <Button
            intent="primary"
            loading={busy}
            onClick={() => void onSave({ name, ground_station_id: groundStationId })}
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

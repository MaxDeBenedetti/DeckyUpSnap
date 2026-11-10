import {
  ConfirmModal,
  DialogButton,
  Field,
  Focusable,
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  TextField,
  ToggleField,
  showModal,
  staticClasses,
} from "@decky/ui";
import { callable, definePlugin, toaster } from "@decky/api";
import { useCallback, useEffect, useState } from "react";
import { FaPowerOff } from "react-icons/fa";

type Device = {
  id: string;
  name: string;
  ip: string;
  mac: string;
  status: string;
  link: string;
  can_shutdown: boolean;
  can_sleep: boolean;
  can_reboot: boolean;
};

type Settings = {
  url: string;
  username: string;
  password: string;
  admin: boolean;
  insecure: boolean;
};

type Action = "wake" | "shutdown" | "sleep" | "reboot";
type Result = { ok: boolean; error?: string };

const getSettings = callable<[], Settings>("get_settings");
const saveSettings = callable<[Settings], boolean>("save_settings");
const testConnection = callable<[], Result>("test_connection");
const listDevices = callable<[], Result & { devices?: Device[] }>("list_devices");
const deviceAction = callable<[string, Action], Result>("device_action");

const EMPTY: Settings = { url: "", username: "", password: "", admin: false, insecure: false };

const STATUS_COLOR: Record<string, string> = {
  online: "#4caf50",
  pending: "#ffb300",
  offline: "#8a8a8a",
};

const VERBS: Record<Action, string> = {
  wake: "Waking",
  shutdown: "Shutting down",
  sleep: "Putting to sleep",
  reboot: "Rebooting",
};

const StatusDot = ({ status }: { status: string }) => (
  <span
    style={{
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      marginRight: 8,
      background: STATUS_COLOR[status] ?? STATUS_COLOR.offline,
    }}
  />
);

const smallBtn = { minWidth: 0, padding: "8px 12px", fontSize: 13 };

const SettingsPanel = ({ onSaved }: { onSaved: () => void }) => {
  const [form, setForm] = useState<Settings>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSettings().then(setForm);
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setBusy(true);
    await saveSettings(form);
    const res = await testConnection();
    setBusy(false);
    toaster.toast({
      title: "UpSnap",
      body: res.ok ? "Connected successfully" : `Login failed: ${res.error}`,
    });
    if (res.ok) onSaved();
  };

  return (
    <PanelSection title="Settings">
      <PanelSectionRow>
        <TextField
          label="Server URL"
          description="e.g. http://192.168.1.10:8090"
          value={form.url}
          onChange={(e) => set("url", e.target.value)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <TextField
          label="Email / username"
          value={form.username}
          onChange={(e) => set("username", e.target.value)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <TextField
          label="Password"
          bIsPassword
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <ToggleField
          label="Admin account"
          description="Log in as a superuser instead of a regular user"
          checked={form.admin}
          onChange={(v) => set("admin", v)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <ToggleField
          label="Allow self-signed certificate"
          checked={form.insecure}
          onChange={(v) => set("insecure", v)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={busy} onClick={save}>
          {busy ? "Connecting…" : "Save & test connection"}
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};

const Content = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const res = await listDevices();
    if (res.ok) {
      setDevices(res.devices ?? []);
      setError(null);
    } else {
      setError(res.error ?? "Unknown error");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (loaded && error) setShowSettings(true);
  }, [loaded, error]);

  const run = async (d: Device, action: Action) => {
    const res = await deviceAction(d.id, action);
    toaster.toast({
      title: "UpSnap",
      body: res.ok ? `${VERBS[action]} ${d.name}` : `Failed: ${res.error}`,
    });
    setTimeout(refresh, 1000);
  };

  const confirm = (d: Device, action: Action) =>
    showModal(
      <ConfirmModal
        strTitle={`${action[0].toUpperCase()}${action.slice(1)} ${d.name}?`}
        strDescription={`This will send the ${action} command to ${d.name}.`}
        strOKButtonText="Yes"
        strCancelButtonText="Cancel"
        onOK={() => run(d, action)}
      />
    );

  return (
    <>
      <PanelSection title="Devices">
        {error && (
          <PanelSectionRow>
            <Field label="Error" description={error} />
          </PanelSectionRow>
        )}
        {!error && loaded && devices.length === 0 && (
          <PanelSectionRow>
            <Field label="No devices found" />
          </PanelSectionRow>
        )}
        {devices.map((d) => (
          <PanelSectionRow key={d.id}>
            <Field
              label={
                <span>
                  <StatusDot status={d.status} />
                  {d.name}
                </span>
              }
              description={`${d.ip || d.mac} · ${d.status}`}
              childrenLayout="below"
              childrenContainerWidth="max"
              bottomSeparator="none"
            >
              <Focusable
                style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                flow-children="horizontal"
              >
                {d.status === "online" ? (
                  <>
                    {d.can_shutdown && (
                      <DialogButton style={smallBtn} onClick={() => confirm(d, "shutdown")}>
                        Shut down
                      </DialogButton>
                    )}
                    {d.can_reboot && (
                      <DialogButton style={smallBtn} onClick={() => confirm(d, "reboot")}>
                        Reboot
                      </DialogButton>
                    )}
                    {d.can_sleep && (
                      <DialogButton style={smallBtn} onClick={() => run(d, "sleep")}>
                        Sleep
                      </DialogButton>
                    )}
                  </>
                ) : (
                  <DialogButton
                    style={smallBtn}
                    disabled={d.status === "pending"}
                    onClick={() => run(d, "wake")}
                  >
                    {d.status === "pending" ? "Waking…" : "Wake"}
                  </DialogButton>
                )}
              </Focusable>
            </Field>
          </PanelSectionRow>
        ))}
      </PanelSection>

      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => setShowSettings((s) => !s)}>
            {showSettings ? "Hide settings" : "Settings"}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      {showSettings && <SettingsPanel onSaved={refresh} />}
    </>
  );
};

export default definePlugin(() => ({
  name: "UpSnap",
  titleView: <div className={staticClasses.Title}>UpSnap</div>,
  content: <Content />,
  icon: <FaPowerOff />,
  onDismount() {},
}));

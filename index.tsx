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
  admin: boolean;
  insecure: boolean;
};

type SettingsState = Settings & { logged_in: boolean };

type Action = "wake" | "shutdown" | "sleep" | "reboot";
type Result = { ok: boolean; error?: string };

const getSettings = callable<[], SettingsState>("get_settings");
const saveSettings = callable<[Settings], boolean>("save_settings");
const login = callable<[string], Result>("login");
const logout = callable<[], boolean>("logout");
const listDevices = callable<[], Result & { devices?: Device[] }>("list_devices");
const deviceAction = callable<[string, Action], Result>("device_action");

const EMPTY: SettingsState = { url: "", username: "", admin: false, insecure: false, logged_in: false };

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

const SettingsPanel = ({ onChanged }: { onChanged: () => void }) => {
  const [form, setForm] = useState<SettingsState>(EMPTY);
  const [password, setPassword] = useState(""); // memory only, never persisted
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getSettings().then(setForm), []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const doLogin = async () => {
    setBusy(true);
    await saveSettings({
      url: form.url,
      username: form.username,
      admin: form.admin,
      insecure: form.insecure,
    });
    const res = await login(password);
    setPassword(""); // wipe the password whether or not login worked
    setBusy(false);
    toaster.toast({
      title: "UpSnap",
      body: res.ok ? "Logged in" : `Login failed: ${res.error}`,
    });
    await load();
    if (res.ok) onChanged();
  };

  const doLogout = async () => {
    await logout();
    await load();
    onChanged();
  };

  return (
    <PanelSection title="Settings">
      <PanelSectionRow>
        <Field
          label={form.logged_in ? `Logged in as ${form.username}` : "Not logged in"}
          description="Only a login token is stored on this device, never your password."
        />
      </PanelSectionRow>
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
          description="Used once to log in, then discarded."
          bIsPassword
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        <ButtonItem layout="below" disabled={busy || !password} onClick={doLogin}>
          {busy ? "Logging in…" : "Log in"}
        </ButtonItem>
      </PanelSectionRow>
      {form.logged_in && (
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={doLogout}>
            Log out
          </ButtonItem>
        </PanelSectionRow>
      )}
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

      {showSettings && <SettingsPanel onChanged={refresh} />}
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

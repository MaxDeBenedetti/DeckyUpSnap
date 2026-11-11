const manifest = {"name":"UpSnap"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const toaster = api.toaster;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var attr = props.attr,
      size = props.size,
      title = props.title,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaPowerOff (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M400 54.1c63 45 104 118.6 104 201.9 0 136.8-110.8 247.7-247.5 248C120 504.3 8.2 393 8 256.4 7.9 173.1 48.9 99.3 111.8 54.2c11.7-8.3 28-4.8 35 7.7L162.6 90c5.9 10.5 3.1 23.8-6.6 31-41.5 30.8-68 79.6-68 134.9-.1 92.3 74.5 168.1 168 168.1 91.6 0 168.6-74.2 168-169.1-.3-51.8-24.7-101.8-68.1-134-9.7-7.2-12.4-20.5-6.5-30.9l15.8-28.1c7-12.4 23.2-16.1 34.8-7.8zM296 264V24c0-13.3-10.7-24-24-24h-32c-13.3 0-24 10.7-24 24v240c0 13.3 10.7 24 24 24h32c13.3 0 24-10.7 24-24z"},"child":[]}]})(props);
}

const getSettings = callable("get_settings");
const saveSettings = callable("save_settings");
const testConnection = callable("test_connection");
const listDevices = callable("list_devices");
const deviceAction = callable("device_action");
const EMPTY = { url: "", username: "", password: "", admin: false, insecure: false };
const STATUS_COLOR = {
    online: "#4caf50",
    pending: "#ffb300",
    offline: "#8a8a8a",
};
const VERBS = {
    wake: "Waking",
    shutdown: "Shutting down",
    sleep: "Putting to sleep",
    reboot: "Rebooting",
};
const StatusDot = ({ status }) => (window.SP_REACT.createElement("span", { style: {
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        marginRight: 8,
        background: STATUS_COLOR[status] ?? STATUS_COLOR.offline,
    } }));
const smallBtn = { minWidth: 0, padding: "8px 12px", fontSize: 13 };
const SettingsPanel = ({ onSaved }) => {
    const [form, setForm] = SP_REACT.useState(EMPTY);
    const [busy, setBusy] = SP_REACT.useState(false);
    SP_REACT.useEffect(() => {
        getSettings().then(setForm);
    }, []);
    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const save = async () => {
        setBusy(true);
        await saveSettings(form);
        const res = await testConnection();
        setBusy(false);
        toaster.toast({
            title: "UpSnap",
            body: res.ok ? "Connected successfully" : `Login failed: ${res.error}`,
        });
        if (res.ok)
            onSaved();
    };
    return (window.SP_REACT.createElement(DFL.PanelSection, { title: "Settings" },
        window.SP_REACT.createElement(DFL.PanelSectionRow, null,
            window.SP_REACT.createElement(DFL.TextField, { label: "Server URL", description: "e.g. http://192.168.1.10:8090", value: form.url, onChange: (e) => set("url", e.target.value) })),
        window.SP_REACT.createElement(DFL.PanelSectionRow, null,
            window.SP_REACT.createElement(DFL.TextField, { label: "Email / username", value: form.username, onChange: (e) => set("username", e.target.value) })),
        window.SP_REACT.createElement(DFL.PanelSectionRow, null,
            window.SP_REACT.createElement(DFL.TextField, { label: "Password", bIsPassword: true, value: form.password, onChange: (e) => set("password", e.target.value) })),
        window.SP_REACT.createElement(DFL.PanelSectionRow, null,
            window.SP_REACT.createElement(DFL.ToggleField, { label: "Admin account", description: "Log in as a superuser instead of a regular user", checked: form.admin, onChange: (v) => set("admin", v) })),
        window.SP_REACT.createElement(DFL.PanelSectionRow, null,
            window.SP_REACT.createElement(DFL.ToggleField, { label: "Allow self-signed certificate", checked: form.insecure, onChange: (v) => set("insecure", v) })),
        window.SP_REACT.createElement(DFL.PanelSectionRow, null,
            window.SP_REACT.createElement(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: save }, busy ? "Connecting…" : "Save & test connection"))));
};
const Content = () => {
    const [devices, setDevices] = SP_REACT.useState([]);
    const [error, setError] = SP_REACT.useState(null);
    const [showSettings, setShowSettings] = SP_REACT.useState(false);
    const [loaded, setLoaded] = SP_REACT.useState(false);
    const refresh = SP_REACT.useCallback(async () => {
        const res = await listDevices();
        if (res.ok) {
            setDevices(res.devices ?? []);
            setError(null);
        }
        else {
            setError(res.error ?? "Unknown error");
        }
        setLoaded(true);
    }, []);
    SP_REACT.useEffect(() => {
        refresh();
        const timer = setInterval(refresh, 5000);
        return () => clearInterval(timer);
    }, [refresh]);
    SP_REACT.useEffect(() => {
        if (loaded && error)
            setShowSettings(true);
    }, [loaded, error]);
    const run = async (d, action) => {
        const res = await deviceAction(d.id, action);
        toaster.toast({
            title: "UpSnap",
            body: res.ok ? `${VERBS[action]} ${d.name}` : `Failed: ${res.error}`,
        });
        setTimeout(refresh, 1000);
    };
    const confirm = (d, action) => DFL.showModal(window.SP_REACT.createElement(DFL.ConfirmModal, { strTitle: `${action[0].toUpperCase()}${action.slice(1)} ${d.name}?`, strDescription: `This will send the ${action} command to ${d.name}.`, strOKButtonText: "Yes", strCancelButtonText: "Cancel", onOK: () => run(d, action) }));
    return (window.SP_REACT.createElement(window.SP_REACT.Fragment, null,
        window.SP_REACT.createElement(DFL.PanelSection, { title: "Devices" },
            error && (window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.Field, { label: "Error", description: error }))),
            !error && loaded && devices.length === 0 && (window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.Field, { label: "No devices found" }))),
            devices.map((d) => (window.SP_REACT.createElement(DFL.PanelSectionRow, { key: d.id },
                window.SP_REACT.createElement(DFL.Field, { label: window.SP_REACT.createElement("span", null,
                        window.SP_REACT.createElement(StatusDot, { status: d.status }),
                        d.name), description: `${d.ip || d.mac} · ${d.status}`, childrenLayout: "below", childrenContainerWidth: "max", bottomSeparator: "none" },
                    window.SP_REACT.createElement(DFL.Focusable, { style: { display: "flex", gap: 8, flexWrap: "wrap" }, "flow-children": "horizontal" }, d.status === "online" ? (window.SP_REACT.createElement(window.SP_REACT.Fragment, null,
                        d.can_shutdown && (window.SP_REACT.createElement(DFL.DialogButton, { style: smallBtn, onClick: () => confirm(d, "shutdown") }, "Shut down")),
                        d.can_reboot && (window.SP_REACT.createElement(DFL.DialogButton, { style: smallBtn, onClick: () => confirm(d, "reboot") }, "Reboot")),
                        d.can_sleep && (window.SP_REACT.createElement(DFL.DialogButton, { style: smallBtn, onClick: () => run(d, "sleep") }, "Sleep")))) : (window.SP_REACT.createElement(DFL.DialogButton, { style: smallBtn, disabled: d.status === "pending", onClick: () => run(d, "wake") }, d.status === "pending" ? "Waking…" : "Wake")))))))),
        window.SP_REACT.createElement(DFL.PanelSection, null,
            window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ButtonItem, { layout: "below", onClick: () => setShowSettings((s) => !s) }, showSettings ? "Hide settings" : "Settings"))),
        showSettings && window.SP_REACT.createElement(SettingsPanel, { onSaved: refresh })));
};
var index = definePlugin(() => ({
    name: "UpSnap",
    titleView: window.SP_REACT.createElement("div", { className: DFL.staticClasses.Title }, "UpSnap"),
    content: window.SP_REACT.createElement(Content, null),
    icon: window.SP_REACT.createElement(FaPowerOff, null),
    onDismount() { },
}));

export { index as default };
//# sourceMappingURL=index.js.map

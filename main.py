import asyncio
import json
import os
import ssl
import urllib.error
import urllib.request

import decky

SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "upsnap.json")

DEFAULTS = {
    "url": "",
    "username": "",
    "password": "",
    "admin": False,  # log in as a PocketBase superuser instead of a normal user
    "insecure": False,  # accept self-signed TLS certificates
    "token": "",
}
PUBLIC_KEYS = ("url", "username", "password", "admin", "insecure")
ACTIONS = ("wake", "shutdown", "sleep", "reboot")


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _load_settings() -> dict:
    settings = dict(DEFAULTS)
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            settings.update(json.load(f))
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return settings


def _save_settings(settings: dict) -> None:
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f)
    try:
        os.chmod(SETTINGS_FILE, 0o600)
    except OSError:
        pass


def _http(method, url, token=None, body=None, insecure=False, timeout=10):
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = token

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    ctx = None
    if url.lower().startswith("https"):
        ctx = ssl.create_default_context()
        if insecure:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw = resp.read().decode()
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        message = raw
        try:
            message = json.loads(raw).get("message", raw)
        except (json.JSONDecodeError, AttributeError):
            pass
        raise ApiError(e.code, message or f"HTTP {e.code}")
    except urllib.error.URLError as e:
        raise ApiError(0, str(e.reason))
    except OSError as e:
        raise ApiError(0, str(e))

    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def _login(s: dict) -> None:
    collection = "_superusers" if s["admin"] else "users"
    res = _http(
        "POST",
        f"{s['url']}/api/collections/{collection}/auth-with-password",
        body={"identity": s["username"], "password": s["password"]},
        insecure=s["insecure"],
    )
    s["token"] = res["token"]
    _save_settings(s)


def _authed(s: dict, method: str, path: str):
    if not s["url"]:
        raise ApiError(0, "Server URL is not set")
    if not s["token"]:
        _login(s)
    url = f"{s['url']}{path}"
    try:
        return _http(method, url, token=s["token"], insecure=s["insecure"])
    except ApiError as e:
        if e.status in (401, 403):
            _login(s)  # token probably expired, retry once
            return _http(method, url, token=s["token"], insecure=s["insecure"])
        raise


def _simplify(rec: dict) -> dict:
    return {
        "id": rec.get("id", ""),
        "name": rec.get("name", ""),
        "ip": rec.get("ip", ""),
        "mac": rec.get("mac", ""),
        "status": rec.get("status", "offline"),
        "link": rec.get("link", ""),
        "can_shutdown": bool(rec.get("shutdown_cmd")),
        "can_sleep": bool(rec.get("sleep_cmd")),
        "can_reboot": bool(rec.get("reboot_cmd")),
    }


class Plugin:
    settings: dict

    async def _main(self):
        self.settings = _load_settings()
        decky.logger.info("UpSnap plugin loaded")

    async def _unload(self):
        decky.logger.info("UpSnap plugin unloaded")

    async def _run(self, fn):
        loop = asyncio.get_running_loop()
        try:
            result = await loop.run_in_executor(None, fn)
            return {"ok": True, **result}
        except ApiError as e:
            return {"ok": False, "error": e.message}
        except Exception as e:  # noqa: BLE001
            decky.logger.exception("UpSnap error")
            return {"ok": False, "error": str(e)}

    # ---- callable from the frontend ----

    async def get_settings(self):
        return {k: self.settings[k] for k in PUBLIC_KEYS}

    async def save_settings(self, new: dict):
        for k in PUBLIC_KEYS:
            if k in new:
                self.settings[k] = new[k]
        self.settings["url"] = str(self.settings["url"]).strip().rstrip("/")
        if self.settings["url"] and "://" not in self.settings["url"]:
            self.settings["url"] = "http://" + self.settings["url"]
        self.settings["token"] = ""  # force re-login with the new credentials
        _save_settings(self.settings)
        return True

    async def test_connection(self):
        def work():
            self.settings["token"] = ""
            if not self.settings["url"]:
                raise ApiError(0, "Server URL is not set")
            _login(self.settings)
            return {}

        return await self._run(work)

    async def list_devices(self):
        def work():
            res = _authed(
                self.settings,
                "GET",
                "/api/collections/devices/records?perPage=200&sort=name",
            )
            return {"devices": [_simplify(r) for r in res.get("items", [])]}

        return await self._run(work)

    async def device_action(self, device_id: str, action: str):
        if action not in ACTIONS:
            return {"ok": False, "error": f"Unknown action: {action}"}

        def work():
            _authed(self.settings, "GET", f"/api/upsnap/{action}/{device_id}")
            return {}

        return await self._run(work)

import asyncio
import json
import os
import ssl
import time
import urllib.error
import urllib.request

import decky

SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "upsnap.json")

# NOTE: the password is deliberately NOT stored. Only the auth token is.
DEFAULTS = {
    "url": "",
    "username": "",
    "admin": False,  # log in as a PocketBase superuser instead of a normal user
    "insecure": False,  # accept self-signed TLS certificates
    "token": "",
    "token_time": 0,  # when the token was issued/refreshed (unix seconds)
}
PUBLIC_KEYS = ("url", "username", "admin", "insecure")
ACTIONS = ("wake", "shutdown", "sleep", "reboot")
REFRESH_AFTER = 6 * 3600  # extend the token if it is older than this


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _save_settings(settings: dict) -> None:
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    # create the file with owner-only permissions from the start
    fd = os.open(SETTINGS_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(settings, f)


def _load_settings() -> dict:
    settings = dict(DEFAULTS)
    stored = {}
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            stored = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    settings.update({k: v for k, v in stored.items() if k in DEFAULTS})
    if "password" in stored:
        # migrate: an older version saved the password; scrub it from disk
        _save_settings(settings)
    return settings


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


def _collection(s: dict) -> str:
    return "_superusers" if s["admin"] else "users"


def _clear_token(s: dict) -> None:
    s["token"] = ""
    s["token_time"] = 0
    _save_settings(s)


def _expired(s: dict) -> ApiError:
    _clear_token(s)
    return ApiError(401, "Session expired. Please log in again.")


def _login(s: dict, password: str) -> None:
    res = _http(
        "POST",
        f"{s['url']}/api/collections/{_collection(s)}/auth-with-password",
        body={"identity": s["username"], "password": password},
        insecure=s["insecure"],
    )
    s["token"] = res["token"]
    s["token_time"] = time.time()
    _save_settings(s)


def _refresh_token(s: dict) -> None:
    """Ask the server for a fresh token so an actively used session never lapses."""
    try:
        res = _http(
            "POST",
            f"{s['url']}/api/collections/{_collection(s)}/auth-refresh",
            token=s["token"],
            insecure=s["insecure"],
        )
        s["token"] = res["token"]
        s["token_time"] = time.time()
        _save_settings(s)
    except ApiError as e:
        if e.status == 401:
            raise _expired(s)
        # network hiccup etc.: keep the current token, the real request will report it
    except (KeyError, TypeError):
        pass


def _authed(s: dict, method: str, path: str):
    if not s["url"]:
        raise ApiError(0, "Server URL is not set")
    if not s["token"]:
        raise ApiError(401, "Not logged in")
    if time.time() - s["token_time"] > REFRESH_AFTER:
        _refresh_token(s)
    try:
        return _http(method, f"{s['url']}{path}", token=s["token"], insecure=s["insecure"])
    except ApiError as e:
        if e.status == 401:
            raise _expired(s)
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
        out = {k: self.settings[k] for k in PUBLIC_KEYS}
        out["logged_in"] = bool(self.settings["token"])
        return out

    async def save_settings(self, new: dict):
        before = (self.settings["url"], self.settings["username"], self.settings["admin"])
        for k in PUBLIC_KEYS:
            if k in new:
                self.settings[k] = new[k]
        self.settings["url"] = str(self.settings["url"]).strip().rstrip("/")
        if self.settings["url"] and "://" not in self.settings["url"]:
            self.settings["url"] = "http://" + self.settings["url"]
        after = (self.settings["url"], self.settings["username"], self.settings["admin"])
        if before != after:
            self.settings["token"] = ""  # a token for another server/account is useless
            self.settings["token_time"] = 0
        _save_settings(self.settings)
        return True

    async def login(self, password: str):
        def work():
            if not self.settings["url"]:
                raise ApiError(0, "Server URL is not set")
            _login(self.settings, password)
            return {}

        return await self._run(work)

    async def logout(self):
        _clear_token(self.settings)
        return True

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

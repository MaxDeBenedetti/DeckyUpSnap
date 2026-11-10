# UpSnap for Decky Loader

Control your [UpSnap](https://github.com/seriousm4x/UpSnap) devices from the Steam Deck's Quick Access menu:
wake, shut down, reboot and sleep, with live online/offline status (refreshes every 5 s).

## Build

Requires Node 18+ and pnpm.

    pnpm install
    pnpm build

## Install on the Deck

Copy the plugin folder to `~/homebrew/plugins/UpSnap/` (needs `plugin.json`, `main.py`,
`package.json` and the built `dist/` folder), then restart Decky Loader:

    sudo systemctl restart plugin_loader

## Setup

Open Quick Access -> UpSnap -> Settings and enter:

- Server URL, e.g. `http://192.168.1.10:8090`
- The email/username and password of an UpSnap user
- Tick "Admin account" only if you log in with a PocketBase superuser

Shut down / reboot / sleep buttons only appear for devices that have the matching
command configured in UpSnap.

## Notes

- Credentials are stored in plain text in Decky's plugin settings dir (file mode 600).
  Use a dedicated UpSnap user with limited permissions.
- Uses UpSnap's `GET /api/upsnap/{wake|shutdown|sleep|reboot}/{id}` endpoints and
  PocketBase's `devices` collection.

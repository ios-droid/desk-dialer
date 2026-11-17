# Desk Dialer

Desk Dialer is a Chrome extension for dialing contacts through a Grandstream desk phone and logging answered calls to a Google Sheet.

## Requirements

- Google Chrome 114 or newer.
- Access to the Desk Dialer licensing service and an account approved by the administrator.
- A compatible Grandstream phone and the required local-network access for dialing features.
- A Google Sheet configured for the extension, if call logging is enabled.

## Install from this repository

1. Install Git on your computer if it is not already installed.
2. Open Terminal (macOS/Linux) or Git Bash (Windows).
3. Clone this repository:

   ```bash
   git clone https://github.com/ios-droid/desk-dialer.git
   ```

4. In Chrome, open `chrome://extensions`.
5. Turn on **Developer mode**.
6. Click **Load unpacked** and select the cloned `desk-dialer` folder (the folder containing `manifest.json`).
7. Open Desk Dialer and sign in with an administrator-approved Google account.

## Receive updates

This repository's update checker compares the installed extension version with `manifest.json` on the public GitHub `main` branch. It checks shortly after installation/startup and then approximately every 6 hours.

The checker only displays a notification; it does **not** download or install updates automatically. When a notification appears:

1. Open Terminal and change to the cloned project folder, for example:

   ```bash
   cd ~/desk-dialer
   ```

2. Pull the latest files:

   ```bash
   git pull
   ```

3. Open `chrome://extensions` and click **Reload** on Desk Dialer.

If you installed from a ZIP rather than by cloning the repository, `git pull` will not work in that folder. Install by cloning the repository, or download the updated source and load that folder instead.

## Publishing a release (maintainers)

1. Make and test your changes locally.
2. Increase the `version` in `manifest.json` (for example, `9.4.0` to `9.4.1`). Chrome extension version values must use dot-separated integers.
3. Commit and push the complete project to `main`:

   ```bash
   git add .
   git commit -m "Release v9.4.1"
   git push origin main
   ```

4. Users will be notified on the next update check, usually within 6 hours while Chrome is running and online. They then run `git pull` and click **Reload** at `chrome://extensions`.

## Configuration and security notes

- The update checker reads `https://raw.githubusercontent.com/ios-droid/desk-dialer/main/manifest.json`. Keep the repository public for this unauthenticated check to work.
- The extension's Google OAuth client ID and public service URL are visible in client-side code. OAuth client IDs are identifiers, not client secrets. Never commit a Google client secret, private API key, signing key, Vercel environment variable, access token, or other credential.
- The licensing UI and client-side checks are visible and can be modified by anyone who controls their local copy. Keep actual authorization decisions and sensitive credentials on the server. A public repository cannot make client-side code tamper-proof. The server implementation is not included in this repository, so its security configuration must be reviewed separately.
- The `key` field in `manifest.json` is a public extension identity key, not a private signing key. Do not replace it casually if you need existing installations to retain the same extension ID.
- This repository does not include a software license. Public visibility lets people view and clone the repository, but does not by itself grant permission to redistribute or modify the software. Add a license only after choosing the terms you intend to grant.
- Review every change before pushing. Do not commit `.env` files, credentials, customer data, call logs, or private Google Sheets data.

## Project contents

- `manifest.json` — Chrome extension manifest and permissions.
- `background.js` — service worker, desk-phone request handling, and GitHub update notifications.
- `license.js` — sign-in and client-side licensing interface.
- `app.html`, `app.js`, `app.css` — extension interface and application logic.
- `sheet/Code.gs` — Google Apps Script code for Sheets integration.
- `server-docs/` — reporting API setup notes and example.

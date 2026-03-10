# Google Drive Sync — Setup Guide

Alchemydoku can sync puzzle progress to the player's Google Drive using a
hidden per-app folder (`appDataFolder`). The file is invisible to the user in
their regular Drive UI — only this app can read or write it.

---

## What syncs

| Data | Synced |
|------|--------|
| Which puzzles are completed (base + expanded) | ✅ |
| Last played puzzle | ✅ (on new device only) |
| Free-play mode flag | ✅ |
| In-progress grid state | ❌ (stays local, per-device) |

Merge strategy: completed sets are **unioned** (you never un-complete a puzzle).
All other fields prefer the local value on conflict.

---

## Google Cloud setup (one-time)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create
   a project (or select an existing one).

2. Enable the **Google Drive API**:
   - APIs & Services → Library → search "Google Drive API" → Enable

3. Create OAuth 2.0 credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Name: `Alchemydoku` (or anything)
   - Authorised JavaScript origins:
     - `https://YOUR-USERNAME.github.io` (for production)
     - `http://localhost:5173` (for local dev)
   - Leave "Authorised redirect URIs" empty (not needed for token flow)
   - Click Create → copy the **Client ID**

4. Configure the OAuth consent screen:
   - APIs & Services → OAuth consent screen
   - User type: External (or Internal if org-only)
   - Fill in app name, support email, developer contact
   - Scopes: add `../auth/drive.appdata`, `../auth/userinfo.profile`, `../auth/userinfo.email`
   - Add yourself as a test user while in Testing status

5. Create a `.env` file in the project root (copy `.env.example`):
   ```
   VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
   ```

6. For GitHub Pages deployment, add the secret to your repository:
   - Settings → Secrets and variables → Actions → New repository secret
   - Name: `VITE_GOOGLE_CLIENT_ID`
   - Value: your client ID

   Then update your GitHub Actions workflow to inject it:
   ```yaml
   - name: Build
     run: npm run build
     env:
       VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
   ```

---

## Local development

```bash
cp .env.example .env
# Edit .env and paste your client ID
npm run dev
```

---

## How it works (technical)

- Auth: [Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model) implicit token flow — no backend required
- Drive: REST API v3 with `Bearer` token, no SDK loaded
- Storage: `drive.appDataFolder` scope — hidden from user's Drive
- File: single `alchemydoku-save.json` in the app folder
- Token: stored in-memory (not localStorage) — refreshed on expiry via silent re-request

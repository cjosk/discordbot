# SupremacyBank Project Index

## 1. Short summary

This repo has two distinct parts:

1. Excel inspection utility in the repo root:
   - `readExcel.js` reads `sheet.xlsx` and writes the first 30 rows of each sheet into `output.json`.
   - `excel_structure.txt` and `output.json` look like generated analysis artifacts.
2. Main product under `app/`:
   - A Vite + React 19 + Zustand guild bank / split / regear panel.
   - The UI is a single-page app.
   - `app/api/` contains Vercel-style serverless endpoints.

Core domain:
- player balances
- loot split approval flow
- Discord to player linking
- regear request and approval flow
- guild roster sync

## 2. Runtime architecture

### Frontend

- Entry: `app/src/main.jsx`
- App shell: `app/src/App.jsx`
- Global state: `app/src/store.js`
- Role and tab permissions: `app/src/roles.js`

After login, `App.jsx` loads:
- players
- discord links
- pending splits
- regear contents
- regear submissions
- live gold price

Tabs:
- Dashboard
- Bank
- Split
- Approvals
- Regear
- RegearApprovals
- Activity
- Settings

### Backend / data gateway

Primary API file:
- `app/api/db.js`

It is the single gateway for:
- `players`
- `discord_links`
- `splits` -> Supabase table `pending_splits`
- `sync`
- `regear_contents`
- `regear_submissions`

Extra proxy:
- `app/api/guild.js`
  - Proxies the Albion guild members endpoint.
  - No active usage was found in the current UI flow.

### Deployment assumption

`app/` is a Vite project, but the frontend calls `/api/...`. That suggests a deployment model like Vercel with static frontend plus serverless functions.

## 3. Important file map

### Repo root

- `package.json`: dependency for the Excel helper (`xlsx`)
- `readExcel.js`: `sheet.xlsx` -> `output.json`
- `sheet.xlsx`: source Excel workbook
- `output.json`: generated sample output
- `excel_structure.txt`: large text structure dump
- `PROJECT_INDEX.md`: this index

### app/

- `app/package.json`: frontend dependencies and scripts
- `app/index.html`: fonts, Material Symbols, Tailwind CDN config
- `app/vite.config.js`: minimal Vite config
- `app/api/db.js`: Supabase REST CRUD plus guild sync
- `app/api/guild.js`: Albion guild proxy

### app/src/

- `app/src/main.jsx`: React mount
- `app/src/App.jsx`: layout, tab routing, initial data loading
- `app/src/store.js`: all fetch and mutation logic
- `app/src/roles.js`: role resolution and tab access matrix
- `app/src/data.json`: game / spreadsheet data dump; no active usage found

### app/src/components/

- `Login.jsx`: Discord implicit auth plus guild role verification
- `Sidebar.jsx`: tab navigation plus manual guild sync
- `Dashboard.jsx`: high-level overview cards
- `BankTable.jsx`: linked-user balance and recent history view
- `SplitCalculator.jsx`: split math, Cloudinary upload, submit
- `SplitApprovals.jsx`: chief/admin split approval screen
- `ActivityLog.jsx`: current user's participation history
- `RegearSubmit.jsx`: regear request form plus screenshot upload
- `RegearAdmin.jsx`: regear content management plus approve/reject
- `Settings.jsx`: user profile and admin placeholder area
- `AccountLinkModal.jsx`: Discord account to in-game character linking flow
- `Compensations.jsx`: unused / unfinished older screen

## 4. Data flows

### Login flow

1. The user logs in with Discord implicit OAuth.
2. `Login.jsx` reads `access_token` from the URL hash.
3. Discord profile data is fetched.
4. Guild membership and a required role are checked.
5. User and token are stored in localStorage:
   - `sb_user`
   - `sb_token`

### Player and balance flow

1. `store.fetchPlayers()` calls `/api/db?table=players`
2. The API reads from Supabase `players`
3. The store maps DB fields into frontend shape:
   - `name` -> `player`
   - `loot_split` -> `lootSplit`
   - other fields mostly stay aligned

### Split flow

1. `SplitCalculator.jsx` computes split values in the browser.
2. Loot proof is uploaded to Cloudinary.
3. `store.submitSplit()` inserts a record into `pending_splits`.
4. `SplitApprovals.jsx` approves or rejects the record.
5. On approve, the store attempts to distribute balance and loot split totals.

Important note:
- `submitSplit()` stores participant names.
- `resolveSplit()` later looks participants up as if they were player ids.
- That mismatch creates a high chance that approval-time balance distribution does not work as intended.

### Regear flow

1. Admin creates active regear content entries.
2. A user selects content, role, and screenshot, then submits.
3. The request is inserted into `regear_submissions`.
4. Admin marks the request as `approved` or `rejected`.

### Guild sync flow

1. Manual sync is triggered from the sidebar.
2. The API fetches the live Albion guild member list.
3. Existing Supabase players are compared against live members.
4. New members are inserted.
5. Missing members are marked inactive with `activity = 0`.

## 5. External services

- Discord OAuth and user/member APIs
- Supabase REST API
- Albion GameInfo guild members API
- Albion Data gold price API
- Cloudinary image upload API

## 6. Run and verification notes

### Root utility

- dependency: `xlsx`
- purpose: inspect the workbook quickly and dump sample JSON

### Frontend

- development: `npm run dev`
- production build: `npm run build`
- lint: `npm run lint`

State observed during this analysis:
- `app` build: passes
- `app` `npm ls zustand`: dependency present
- `app` lint: fails

Lint currently reports:
- unused variables
- missing hook dependency warnings

`app/build_error.txt` contains an older `zustand` resolution failure, but that issue did not reproduce in the current environment and now looks stale.

## 7. Codebase observations

### Strengths

- Zustand centralizes the business flows in one place.
- Main screens are separated by business capability.
- Supabase REST usage is simple and easy to trace.
- Guild sync and split/regear approval flows provide a workable core.

### Critical security risks

1. `app/src/components/SplitCalculator.jsx`
   - Cloudinary `apiSecret` is hardcoded in client code.
   - This secret will ship to the browser and should be removed immediately.

2. `app/src/components/RegearSubmit.jsx`
   - The same Cloudinary secret is also hardcoded here.
   - Same issue, same urgency.

3. `app/api/db.js`
   - A Supabase secret key is committed directly in the repo.
   - Even if it stays server-side at runtime, the repository now contains a privileged credential.
   - It should be moved to environment variables.

### Functional risks

1. `app/src/store.js`
   - Split participants are stored as names but later processed like ids.
   - Approval-time payouts may silently fail.

2. `app/src/App.jsx`
   - `AccountLinkModal` is not rendered anywhere.
   - First-time account linking appears disconnected from the active UI.

3. `app/src/components/Compensations.jsx`
   - Expects an `updatePlayer` function.
   - The store does not expose that function.
   - If this screen is wired back in, it will break.

4. `app/src/components/BankTable.jsx`
   - `displayPlayers` is calculated but never rendered.
   - The component name suggests a table, but the current UI is mostly summary cards and activity history.

### Structural risks

1. The repo root mixes the Excel helper layer and the product app.
   - Responsibilities are blurred.
   - Separate folders or separate repos would be cleaner.

2. Tailwind is loaded from CDN instead of build-time tooling.
   - Fine for fast prototyping.
   - Weaker long-term for control, caching, and reproducible builds.

3. These files look unused or only partially integrated:
   - `app/src/data.json`
   - `app/tools.html`
   - `app/api/guild.js`
   - `app/src/components/Compensations.jsx`
   - `app/src/components/AccountLinkModal.jsx`

## 8. Recommended next steps

1. Remove secrets from source:
   - move Cloudinary signing to a server endpoint
   - move Supabase key to environment variables

2. Fix the split data model:
   - store participant ids and display names separately

3. Reconnect account linking:
   - mount `AccountLinkModal` in the app shell

4. Clean dead or half-wired files:
   - `Compensations`
   - unused proxy / data artifact files

5. Bring lint back to green:
   - remove unused vars
   - fix hook dependency warnings

## 9. Quick commands

Root Excel utility:

```bash
node readExcel.js
```

Frontend:

```bash
cd app
npm run dev
npm run build
npm run lint
```

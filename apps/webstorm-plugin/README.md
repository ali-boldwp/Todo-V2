# DevManager WebStorm Plugin (Scaffold)

This is a JetBrains plugin scaffold for WebStorm that integrates your task workflow into the IDE.

## Included

- Tool window: `DevManager`
- Tabs: `My Tasks`, `Project Tasks`
- Task details panel with quick actions
- Activity logs viewer (`/tasks/:id/logs`)
- Auth token storage via `PasswordSafe`
- Browser login button to `https://beta.devregion.com/`
- Project dropdown filter (`/projects`) in Project Tasks tab
- Rich filters: status, priority, search
- API service stubs wired to your backend
- Git workflow service stubs wired to `git4idea`

## Configure

1. Open `apps/webstorm-plugin` as a Gradle project in IntelliJ IDEA.
2. Run Gradle task `runIde`.
3. In the plugin tool window:
   - Set Base URL (default: `http://localhost:5000/api`)
   - Click `Login with DevRegion`
   - Complete auth in browser at `https://beta.devregion.com/`
   - Token is captured automatically by local callback and saved
4. Use filters:
   - `Project Tasks` tab has project dropdown
   - Status/priority/search filters are available in task list header

## Notes

- This is an MVP scaffold and intentionally keeps parsing/actions pragmatic.
- Keep backend as source of truth for critical checks (merge rules, no-change finish block).
- Known backend codes like `no_changes_not_allowed` and merge conflict codes are surfaced with explicit dialogs.
- Browser callback accepts either:
  - `token` / `access_token` query param directly, or
  - `code` query param and backend exchange via `POST /auth/ide/exchange`

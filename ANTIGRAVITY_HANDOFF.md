# Antigravity + Codex Handoff

This is the dedicated app workspace:

```text
D:\caht app\chatapp
```

Do not edit files outside `chatapp` unless the user explicitly asks.

## Collaboration Rules

- Read this file before starting a task.
- Keep all app work inside `D:\caht app\chatapp`.
- Do not overwrite unrelated changes.
- Keep work scoped to the assigned task.
- After making changes, update this file with changed files and a short status note.
- If a task touches encryption, auth, device keys, recovery, or AI access, leave a note about security assumptions.

## App Direction

Build a web + Android app with end-to-end encryption first, then add AI agents carefully.

Core rule:

> Clients own plaintext. The backend stores and syncs ciphertext only.

## MVP Priorities

1. Define encrypted payload format and key model.
2. Build auth and device registration.
3. Create one encrypted object type end to end.
4. Sync encrypted data between web and Android.
5. Add device approval and recovery key flow.
6. Add encrypted sharing.
7. Add AI only with clear user permission.

## AI Privacy Modes

- Private AI: runs on device and can read locally decrypted content.
- Metadata AI: runs on server but never reads encrypted content.
- Cloud AI: only receives selected content after explicit user consent.

## Antigravity Task Prompt

Paste or send this to Antigravity:

```text
You are working with Codex in D:\caht app\chatapp. Read ANTIGRAVITY_HANDOFF.md first.

Task: Review this clean app workspace and propose the best first implementation step for building a web + Android app with end-to-end encryption and optional AI agents.

Do not edit files outside D:\caht app\chatapp. Do not make broad refactors. If you edit files, update ANTIGRAVITY_HANDOFF.md with changed files, summary, and any risks.
```

## Status

- Codex created the dedicated app folder: `D:\caht app\chatapp`.
- Codex created `README.md` and this handoff file.
- Antigravity reviewed the workspace and created `PROPOSED_PLAN.md` detailing the cryptographic and project layout specs.
- Antigravity implemented premium interactive additions: Web Drawing Board modal (`#web-draw-modal`), Web Audio frequency visualizer baseline (`#login-audio-visualizer`), Reels and Camera styling shader selects, and Rich user presence indicators.
- Configured app for 24/7 production web hosting: Added a root-level `package.json` for universal cloud builder support, and refactored `backend/database.js` to act as a hybrid database connector supporting both SQLite (local development fallback) and PostgreSQL (using Node `pg` pools for Render + Supabase hosting). Tables are created/seeded conditionally (preventing data wipes on restarts), and database paths are controlled via `DATABASE_URL` or `DB_PATH` environment variables.
- Created [deployment_guide.md](file:///C:/Users/HP/.gemini/antigravity/brain/7a637446-373b-4caa-89ce-d8402bf7c602/deployment_guide.md) detailing step-by-step instructions.
- Modified files: `frontend-web/index.html`, `frontend-web/style.css`, `frontend-web/app.js`, `backend/database.js`, `backend/server.js`, and `package.json`.
- Security validation: Verified E2EE sketch transfer (`scratch/test_web_draw.js`) and standard E2EE pipeline (`scratch/test_e2ee.js`).
- Antigravity CLI is installed locally at `D:\caht app\chatapp\.tools\agy\agy.exe`.
- Antigravity CLI version: `1.0.5`.
- Antigravity has been authenticated with Google OAuth.
- Use this app folder as the Antigravity workspace:

```powershell
$env:USERPROFILE = "D:\caht app\chatapp\.tools\agy-home"
$env:LOCALAPPDATA = "D:\caht app\chatapp\.tools\agy-local"
.\.tools\agy\agy.exe
```

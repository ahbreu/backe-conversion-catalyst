# BACA-5 Review - BACA-4 Lead Backend Implementation

Date: 2026-04-29  
Reviewer: Codex (agent 1945750b-29cc-4537-9ac6-c2fffaddd38f)

## Scope Reviewed

- `backend/server.js`
- `backend/package.json`
- `src/components/ContactForm.tsx`
- `.gitignore`

## Review Verdict

Changes requested.

## Findings

### 1) Medium: `dotenv` loading depends on process CWD and can silently break CORS

- Location: `backend/server.js:1`, `backend/server.js:30-33`
- Behavior: `require('dotenv').config()` loads `.env` from the current working directory.  
  If the backend is started from the repository root (`node backend/server.js`), `backend/.env` is not loaded.
- Impact: `FRONTEND_URL` stays undefined and `cors` does not send `Access-Control-Allow-Origin`, so browser requests from the frontend are blocked by CORS.
- Reproduction (executed in this review):
  - Start from root: `node backend/server.js` -> `GET /health` with `Origin: http://localhost:8080` returned `allowOrigin: null`
  - Start from backend dir: `node server.js` (cwd `backend`) -> same request returned `allowOrigin: http://localhost:8080`
- Recommended fix:
  - Load env file explicitly from backend directory, e.g. `dotenv.config({ path: path.join(__dirname, '.env') })`.
  - Optionally fail fast if `FRONTEND_URL` is missing in non-development environments.

### 2) Medium: Invalid JSON requests bypass API contract and return HTML stack traces

- Location: `backend/server.js:36` (JSON parser), no custom parser error middleware after route registration.
- Behavior: malformed JSON triggers Express default error handling and returns an HTML error page (with stack trace in dev) instead of the API JSON format.
- Impact:
  - Frontend/backend contract inconsistency (`ContactForm` expects JSON payloads and can surface generic parsing failures).
  - Internal stack details are exposed in responses during development.
- Reproduction (executed in this review):
  - `POST /api/leads` with malformed JSON body returned HTTP `400` and an HTML page with `SyntaxError` stack output.
- Recommended fix:
  - Add centralized error middleware that catches `SyntaxError` from `express.json()` and returns a JSON response, e.g. `{ ok: false, message: 'JSON inválido.' }`.

### 3) Low: Missing backend runtime docs and `.env.example`

- Location: repository docs and backend root.
- Behavior: no `backend/.env.example` and no backend startup section in `README.md`.
- Impact: setup is error-prone and contributes to environment misconfiguration (for example, starting from the wrong CWD).
- Recommended fix:
  - Add `backend/.env.example` with `PORT` and `FRONTEND_URL`.
  - Add concise backend run instructions to `README.md`.

## Checks Executed

- `npm run lint` (repository root) - passed.
- API smoke checks for `POST /api/leads` with all 5 `faturamento` options extracted from `ContactForm.tsx` - all returned `201`.
- malformed JSON check for `POST /api/leads` - returned HTTP `400` with HTML error page/stack trace.

## Next Action

- Implement finding #1 and #2 in `backend/server.js`, then add a short `backend/.env.example` and README backend section (finding #3).

# Sign2Voice test report

Test date: 2026-11-26. Tested commit: `3f9dee6` on branch `ui-redesign` (web UI redesign plus the desktop launch fix).
Everything below was run for real (real server, real database, real browser, real desktop app); nothing was mocked in the
end-to-end run. Numbers for the machine-learning evaluation are in [`ml/results/eval_table.md`](../ml/results/eval_table.md)
and [`docs/ROBUSTNESS.md`](ROBUSTNESS.md); this report covers the **software system** (web app, API, desktop app, install).

## Summary
| Area | Result |
|---|---|
| End-to-end web + desktop-launch test | **18 / 18 checks passed** |
| API security checks (curl) | all expected responses |
| Dependency audit (`npm audit`, server and client) | 0 known vulnerabilities |
| Lint and production build (client) | 0 errors, build succeeds |
| Clean-install test (fresh clone, new venv, `npm ci`) | passed |
| ML smoke test (1 epoch) and shipped-model load | passed (96.55 % on a random split, 589,852 parameters) |
| Bugs found by testing | 1 real older bug found and fixed (see below) |

## Environment
Windows 11, Python 3.11.9, Node.js 26.13.1 / npm 11.20.0, MongoDB Server 9.0 (local install), Microsoft Edge 158 (headless, driven by
puppeteer-core), TensorFlow 2.16.1, MediaPipe 0.10.14, React 19, Vite 7.

## Test accounts and credentials used
All data lives in a **throwaway database** (`sign2voice_e2e`) that is created for the run and dropped afterwards. No real
account or real data was used or touched. The test server ran on port 5055 with its own `CLIENT_URL`; the browser was
redirected to it, so the developer's normal server and database on port 5000 were never contacted.

| Role | Email | Username | Password | Notes |
|---|---|---|---|---|
| Test user | `e2e-user@test.local` | `e2euser` | `E2e-Test#2026` | Created by the test itself through the sign-up form; meets the password rule (8+ chars, letter, number, symbol). Valid only inside the throwaway database. |
| Test admin | `e2e-admin@test.local` | - | random, generated per run | Created with `node createAdmin.js` using a freshly generated random password that exists only as an environment variable for that run, is never written to a file, and is discarded with the database. |
| Wrong-password cases | the two accounts above | - | `wrong-Pass1!` (user), `wrong-password` (admin) | Used to check that bad logins are rejected. |

The real admin account and the secrets in `web/Server/.env` were not used for testing and are not part of this repository.

## 1. End-to-end test (18 checks, all passed)
Script: [`tests/e2e/e2e.mjs`](../tests/e2e/e2e.mjs). It drives a real browser through the app against the real API and database.

| # | Check | Result |
|---|---|---|
| 1 | Sign-in page renders (hero, "Try it yourself", credit line); no personal contact details; ASL alphabet image loads | PASS |
| 2 | Sign-up: "Passwords do not match" appears live and a mismatched form is not submitted | PASS |
| 3 | Sign-up: both password fields have working show/hide toggles | PASS |
| 4 | Sign-up with valid data creates the account and opens the dashboard | PASS |
| 5 | New user sees daily goal 0/10 and an empty history | PASS |
| 6 | Saving sentences through the API (the same call the desktop app makes) returns 201 | PASS |
| 7 | Dashboard shows the saved sentences, correct stats and daily goal 2/10 | PASS |
| 8 | Deleting a sentence works and the goal updates to 1/10 | PASS |
| 9 | ASL alphabet reference expands and the image is visible | PASS |
| 10 | "Open Sign2Voice" starts the real desktop app with the user's session and the server receives its ready signal | PASS |
| 11 | Logout returns to the sign-in page | PASS |
| 12 | Login with a wrong password shows "Invalid credentials" | PASS |
| 13 | Login with the correct password opens the dashboard with the saved data | PASS |
| 14 | `/dashboard` without a token redirects to the sign-in page | PASS |
| 15 | Admin login with a wrong password shows an error | PASS |
| 16 | Admin login with the correct password opens the panel and lists the user and sentences | PASS |
| 17 | Admin logout works | PASS |
| 18 | `/admin-panel` without a token redirects to the admin login | PASS |

No browser console errors or uncaught exceptions occurred during the final run.

### Run history (for transparency)
The first runs did **not** pass 18/18; the causes were found and are listed here.
1. Runs 1-2: 11 of 18 failed because of a bug **in the test script** (a "clear field" step left old text in the confirm-password field, so the
   app correctly refused the mismatched passwords). Fixed in the script.
2. Run 3: 17 of 18 passed. "Open Sign2Voice" failed: a **real bug in the desktop app**, found by this test (below).
3. Run 4: failed because the login **rate limiter** (20 attempts per 15 minutes) correctly blocked the repeated test logins from the same IP; the throwaway server was restarted to reset it.
4. Final run: 18 / 18.

### Bug found and fixed
When the web server starts the desktop app, the app's "ready" message was held in an output buffer, so the server never saw it and the
"Open Sign2Voice" button reported an error after 120 s even though the app window was open. Fixed in `desktop/gui_main.py` (line-buffered
output and an explicit flush); the launch check now passes.

## 2. API security checks (curl against the test server)
| Check | Expected | Result |
|---|---|---|
| `GET /api/health` | 200 OK | PASS |
| Login with `{"email": {"$ne": null}, "password": "x"}` (NoSQL operator injection) | rejected, no query run | PASS (400, "All fields are required") |
| `POST /api/open-webcam` without a token | 401 | PASS |
| `GET /api/admin-panel/users` without a token | 401 | PASS |
| Rapid wrong logins from one IP | 400 until the limit, then 429 | PASS (20 attempts allowed, then 429) |

## 3. Static checks and dependencies
| Check | Result |
|---|---|
| `npm audit` (server, production deps) | 0 vulnerabilities (before: 2 critical, 4 high, 1 moderate) |
| `npm audit` (client, production deps) | 0 vulnerabilities (before: 1 critical, 10 high, 1 moderate) |
| `npm run lint` (client) | 0 errors, 0 warnings |
| `npm run build` (client) | succeeds |
| `node --check` on server entry and routes | passes |

## 4. Clean-install test
A fresh clone of the pushed branch into an empty folder with a brand-new Python 3.11 virtual environment:
`pip install -r ml/requirements.txt` and `desktop/requirements.txt`, a 1-epoch training smoke test on the committed data (96.55 % on a
random split), loading the shipped `.keras` model (589,852 parameters), `npm ci` for server and client, the client build and lint. All passed.

## 5. What was not covered
* **Sign recognition accuracy inside the live app:** the real webcam was not used by the automated test. Model quality is covered by the offline evaluation (`ml/results/`).
* The desktop window itself was started but not driven (no clicking inside the Tk window); its save and history calls are covered through the same API calls (check 6).
* Browsers: only Chromium-based Edge was used. Layouts were also rendered at phone width and checked by eye, not by an automated visual test.
* There is no unit-test suite in the repository; this report is based on the end-to-end script, curl checks and static checks above.
* Load, accessibility auditing and penetration testing were not performed.

## How to reproduce the end-to-end test
```bash
# 1. Throwaway database and test admin (never your real .env values)
cd web/Server
export MONGO_URI="mongodb://127.0.0.1:27017/sign2voice_e2e"
export E2E_ADMIN_EMAIL="e2e-admin@test.local"
export E2E_ADMIN_PW="$(node -e "console.log(require('crypto').randomBytes(12).toString('base64url')+'#1aA')")"
ADMIN_EMAIL="$E2E_ADMIN_EMAIL" ADMIN_PASSWORD="$E2E_ADMIN_PW" node createAdmin.js

# 2. Test API on port 5055 (same shell, so MONGO_URI points at the throwaway DB)
PORT=5055 CLIENT_URL=http://localhost:5199 node main.js &

# 3. Client on port 5199
cd ../Client && npx vite --port 5199 --strictPort &

# 4. Run the test (needs a Chromium-based browser; set BROWSER_PATH if it is not Edge at the default Windows path)
cd ../../tests/e2e && npm install && node e2e.mjs
```
The "Open Sign2Voice" check starts the real desktop app and needs the project's Python environment (`PYTHON_BIN` in `web/Server/.env`)
and the models downloaded once; stop the desktop app afterwards. Drop the `sign2voice_e2e` database when finished. The login rate limit
(20 attempts per 15 minutes per IP) applies, so restart the test API between repeated runs.

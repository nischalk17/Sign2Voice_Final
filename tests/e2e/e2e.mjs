import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";

/**
 * End-to-end test of the Sign2Voice web app + desktop launch (see docs/TEST_REPORT.md for how to run it).
 * Needs: the API running on :5055 against a THROWAWAY database, the Vite client on :5199, an admin account created
 * with E2E_ADMIN_EMAIL / E2E_ADMIN_PW, and a Chromium-based browser (BROWSER_PATH, default: Microsoft Edge on Windows).
 * The client has http://localhost:5000 hard-coded, so this script redirects those requests to the test API.
 */
const EDGE = process.env.BROWSER_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://localhost:5199";
const API_TEST = "http://localhost:5055";
const USER = { name: "e2euser", email: "e2e-user@test.local", pw: "E2e-Test#2026" };
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, pw: process.env.E2E_ADMIN_PW };

const results = [];
const pass = (n) => { results.push(["PASS", n]); console.log("PASS", n); };
const fail = (n, e) => { results.push(["FAIL", n + " :: " + e]); console.log("FAIL", n, "::", e); };
async function check(name, fn) { try { await fn(); pass(name); } catch (e) { fail(name, e.message.split("\n")[0]); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (p) => p.evaluate(() => document.body.innerText);
async function waitText(p, re, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await text(p))) return; await sleep(150); }
  throw new Error("text not found: " + re + " | page: " + (await text(p)).replace(/\s+/g, " ").slice(0, 200));
}
async function setValue(p, sel, v) { await p.$eval(sel, (e) => { e.focus(); e.select(); }); await p.keyboard.press('Backspace'); await p.type(sel, v); }
async function clickByText(p, tag, label) {
  const ok = await p.evaluate((tag, label) => {
    const el = [...document.querySelectorAll(tag)].find((e) => e.innerText.trim() === label || e.getAttribute("aria-label") === label);
    if (!el) return false; el.click(); return true;
  }, tag, label);
  if (!ok) throw new Error(`no <${tag}> "${label}"`);
}

const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const problems = [];
await page.setRequestInterception(true);
page.on("request", (r) => {
  const u = r.url();
  if (u.startsWith("http://localhost:5000")) return r.continue({ url: u.replace("http://localhost:5000", API_TEST) });
  r.continue();
});
page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) problems.push("console: " + m.text().slice(0, 150)); });

// ---------- sign-up ----------
await page.goto(BASE + "/", { waitUntil: "networkidle0" });
await check("auth page renders (title, sections, no personal info)", async () => {
  const t = await text(page);
  if (!/Spell with your hands/.test(t)) throw new Error("hero missing");
  if (!/Try it yourself/.test(t) || !/Nischal Dhoj Kunwar/.test(t)) throw new Error("try-it/credit missing");
  if (/9863225429|support@sign2voice/.test(t)) throw new Error("personal contact still present");
  const img = await page.$eval('img[src="/asl-alphabet.jpg"]', (i) => i.complete && i.naturalWidth > 100);
  if (!img) throw new Error("alphabet image not loaded");
});
await check("sign-up: mismatch message shows live and blocks submit", async () => {
  await clickByText(page, "button", "Create account");
  await page.type('input[name="username"]', USER.name);
  await page.type('input[name="email"]', USER.email);
  await page.type('input[name="password"]', USER.pw);
  await page.type('input[name="confirmPassword"]', "nope-nope");
  await waitText(page, /Passwords do not match/);
  await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
  await sleep(500);
  if (!/\/$/.test(page.url())) throw new Error("navigated despite mismatch");
});
await check("sign-up: eye toggles reveal both password fields", async () => {
  await clickByText(page, "button", "Show password");
  const t1 = await page.$eval('input[name="password"]', (e) => e.type);
  const toggles = await page.$$('button[aria-label="Show password"]');
  await toggles[0].click();
  const t2 = await page.$eval('input[name="confirmPassword"]', (e) => e.type);
  if (t1 !== "text" || t2 !== "text") throw new Error(`types ${t1},${t2}`);
});
await check("sign-up: valid data creates account and opens dashboard", async () => {
  await setValue(page, 'input[name="confirmPassword"]', USER.pw);
  await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
  try { await page.waitForFunction(() => location.pathname === "/dashboard", { timeout: 8000 }); }
  catch { throw new Error("no navigation; page says: " + (await text(page)).replace(/\s+/g, " ").slice(-350) + " | pw=" + await page.$eval('input[name="password"]', (e) => e.value) + " confirm=" + await page.$eval('input[name="confirmPassword"]', (e) => e.value)); }
  await waitText(page, /Welcome back, e2euser/);
});
await check("dashboard: new user sees goal 0/10 and empty history", async () => {
  await waitText(page, /Nothing saved yet/);
  if (!/0\s*\/\s*10/.test(await text(page))) throw new Error("goal not 0/10: " + (await text(page)).slice(0, 300));
});

// ---------- save sentences like the desktop GUI does (real API), then reload ----------
const token = await page.evaluate(() => localStorage.getItem("token"));
await check("API: saving sentences (as desktop GUI does) works", async () => {
  for (const t of ["hello world", "thank you"]) {
    const r = await fetch(API_TEST + "/api/sentences/", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ text: t, sessionId: "sess-e2e", source: "gui" }) });
    if (r.status !== 201) throw new Error("status " + r.status);
  }
});
await page.reload({ waitUntil: "networkidle0" });
await check("dashboard: history, stats and daily goal reflect saved sentences", async () => {
  await waitText(page, /hello world/);
  const t = await text(page);
  if (!/thank you/.test(t)) throw new Error("second sentence missing");
  if (!/2\s*\/\s*10/.test(t)) throw new Error("goal not 2/10");
  if (!/Saved sentences\s*\n?\s*2/.test(t)) throw new Error("saved count not 2");
});
await check("dashboard: deleting a sentence works and updates goal", async () => {
  await clickByText(page, "button", "Delete sentence");
  await waitText(page, /Sentence deleted/);
  await waitText(page, /1\s*\/\s*10/);
});
await check("dashboard: ASL alphabet reference expands", async () => {
  await page.evaluate(() => document.querySelector("details summary").click());
  const vis = await page.$eval('details img[src="/asl-alphabet.jpg"]', (i) => i.getBoundingClientRect().height > 100);
  if (!vis) throw new Error("image not visible");
});

// ---------- open the desktop app (real launch; token handed over) ----------
await check("Open Sign2Voice: authenticated launch reaches READY (desktop app starts)", async () => {
  await clickByText(page, "button", "Open Sign2Voice");
  await waitText(page, /launched and ready|already running/i, 120000);
});
try {
  execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like \'*gui_main.py*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"');
} catch {}

// ---------- logout / login ----------
await check("logout returns to sign-in page", async () => {
  await clickByText(page, "button", "Log out");
  await page.waitForFunction(() => location.pathname === "/", { timeout: 5000 });
  await waitText(page, /Welcome back/);
});
await check("login: wrong password shows error", async () => {
  await page.type('input[name="email"]', USER.email);
  await page.type('input[name="password"]', "wrong-Pass1!");
  await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
  await waitText(page, /Invalid credentials/);
});
await check("login: correct credentials open dashboard with saved data", async () => {
  await setValue(page, 'input[name="password"]', USER.pw);
  await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
  await page.waitForFunction(() => location.pathname === "/dashboard", { timeout: 8000 });
  await waitText(page, /thank you|hello world/);
});
await check("dashboard without token redirects to sign-in", async () => {
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle0" });
  await sleep(300);
  if (new URL(page.url()).pathname !== "/") throw new Error("stayed on " + page.url());
});

// ---------- admin ----------
await check("admin login: wrong password shows error", async () => {
  await page.goto(BASE + "/admin-login", { waitUntil: "networkidle0" });
  await page.type('input[name="email"]', ADMIN.email);
  await page.type('input[name="password"]', "wrong-password");
  await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
  await waitText(page, /Invalid credentials/);
});
await check("admin login: correct credentials open panel listing users and sentences", async () => {
  await setValue(page, 'input[name="password"]', ADMIN.pw);
  await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
  await page.waitForFunction(() => location.pathname === "/admin-panel", { timeout: 8000 });
  await waitText(page, /e2e-user@test\.local/);
  await waitText(page, /thank you|hello world/);
});
await check("admin panel: logout works", async () => {
  await clickByText(page, "button", "Log out");
  await page.waitForFunction(() => location.pathname === "/", { timeout: 5000 });
});
await check("admin panel without token redirects to admin login", async () => {
  await page.goto(BASE + "/admin-panel", { waitUntil: "networkidle0" });
  await sleep(300);
  if (new URL(page.url()).pathname !== "/admin-login") throw new Error("stayed on " + page.url());
});

await browser.close();
console.log("\nBrowser problems:", problems.length ? problems : "none");
console.log("\nSUMMARY:", results.filter((r) => r[0] === "PASS").length, "passed,", results.filter((r) => r[0] === "FAIL").length, "failed");

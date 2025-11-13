# StormMaker Code Review / Gap Analysis Report
Date: 2025-11-13

Repository: https://github.com/stonezone/StormMaker

> **Important scope note (VALIDATED):** Due to limitations in the browsing environment, I can see the **repository root listing and embedded README content**, but **not the actual source files under `src/`, `docs/`, or `tools/`**, nor the contents of `CODE_REVIEW.md` or `ACCEPTANCE.md`. All comments that depend on code internals are therefore **UNVALIDATED / speculative**. Structural observations about the repo root and README are **VALIDATED** based on what I can see from GitHub’s HTML.【turn0view0】

---

## 1. High-Level Overview (VALIDATED)

From the root README and repo layout:【turn0view0】

- **Project:** StormMaker / North Pacific Swell Lab
- **Purpose:** Browser-based simulation showing how North Pacific storms light up Oʻahu’s North Shore.
- **Tech stack (from README):**
  - Vite-based front-end with `npm run dev`, `npm run build`, `npm run preview`.
  - Source lives under `src/` and builds into a `dist/` bundle.
  - Static assets under `public/`.
  - macOS launcher app in `mac/` driven by an AppleScript in `tools/`.
- **Repository layout (root level):**【turn0view0】
  - `.claude`, `.serena` (prompt / assistant config)
  - `docs/`
  - `mac/ StormMaker Launcher.app/ Contents`
  - `node_modules/`
  - `public/`
  - `src/`
  - `tools/`
  - `ACCEPTANCE.md`
  - `CODE_REVIEW.md`
  - `README.md`
  - `index.html`
  - `package-lock.json`
  - `package.json`

**Overall confidence on the above:** **High / VALIDATED** – taken directly from the root page.

---

## 2. Immediate Repository Hygiene Issues (Needs Attention)

These are things you can address without touching any internal logic.

### 2.1 `node_modules/` is committed (VALIDATED)

The root listing shows `node_modules/` under version control.【turn0view0】

**Why this is a problem (VALIDATED):**

- Bloats the repo size, slows clones and pulls.
- Can introduce subtle inconsistencies if contributors rely on committed dependencies instead of lockfile resolution.
- Standard practice is to **exclude** `node_modules` entirely and rely on `package.json + package-lock.json`.

**How to fix (VALIDATED):**

1. Add `node_modules/` to `.gitignore` (if `.gitignore` exists, append; otherwise create it):
   ```gitignore
   node_modules/
   dist/
   .DS_Store
   ```
2. Remove `node_modules` from the repo history (for current master):
   ```bash
   git rm -r --cached node_modules
   git commit -m "Remove node_modules from repo; rely on lockfile"
   ```
3. If you care about repo size and this project is long-lived, you can later run `git filter-repo` (or `git filter-branch` in older Git) to scrub historic `node_modules` blobs, but that changes history and is optional for now.

**Confidence:** High / VALIDATED (directory clearly present).

---

### 2.2 Missing explicit LICENSE file (LIKELY, UNVALIDATED)

The root listing shown does **not** include a `LICENSE` or `LICENSE.md` file.【turn0view0】  
It’s possible one exists but wasn’t visible in the excerpt, so this point is **UNVALIDATED**, but **probable**.

**Why this matters:**

- Without a license, legally the default is “all rights reserved”. People can view the code on GitHub but have unclear rights to use, modify, or share it.
- If you intend this to be used by students, collaborators, or the broader community, an explicit open-source license is strongly recommended.

**How to address:**

- Decide on a license (MIT, Apache-2.0, GPL-3.0, etc.) and add a `LICENSE` file at the repo root.
- Optionally add a `license` field in `package.json` to keep npm metadata consistent.

**Confidence:** Medium / UNVALIDATED (inferred from partial file listing).

---

### 2.3 No visible CI / automation config (UNVALIDATED but likely)

The current root listing does not show a `.github/` directory for Actions workflows or any obvious CI config.【turn0view0】  
This may be a visibility artifact, so treat as **UNVALIDATED**.

**Why CI is useful here:**

- For a Vite-driven simulation app you likely want automated:
  - `npm run lint`
  - `npm test` or equivalent (if tests exist)
  - `npm run build` to guarantee the app still compiles
- CI catches regressions early and documents the “happy path” for builds.

**Suggested baseline (UNVALIDATED / DESIGN):**

1. Add a GitHub Actions workflow (e.g. `.github/workflows/ci.yml`):
   ```yaml
   name: CI

   on:
     push:
       branches: [ master ]
     pull_request:
       branches: [ master ]

   jobs:
     build-and-test:
       runs-on: ubuntu-latest

       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '22' # or the version you actually use
             cache: 'npm'
         - run: npm ci
         - run: npm run build
         # - run: npm test   # once you have tests
   ```

2. Pin a Node version in `engines` in `package.json` once you settle on it.

**Confidence:** Medium / UNVALIDATED (no CI files visible, but listing may be truncated).

---

## 3. Project Documentation & Specs

### 3.1 README quality (VALIDATED)

The README embedded on the root page is **solid**:【turn0view0】

- Explains the purpose of the app (North Shore swell lab).
- Documents standard Vite commands:
  - `npm install`
  - `npm run dev`
  - `npm run build`
  - `npm run preview`
- Describes repo layout (`docs/`, `src/`, `public/`).
- Explains the macOS launcher and associated npm scripts (`launcher:build`, `launcher:run`).
- Provides a brief development roadmap mapping spec phases to implementation.

**No major changes required here.** Minor enhancements you might consider:

- Add a **“Tech stack”** bullet explicitly listing: Vite, vanilla JS / TS or React (whichever you use), CSS approach, and any key libs.
- Add a short **“Contributing”** section that points at `CODE_REVIEW.md` / `ACCEPTANCE.md` once those are being used as living docs.

**Confidence:** High / VALIDATED (text came directly from the README section on root).

---

### 3.2 `docs/`, `CODE_REVIEW.md`, and `ACCEPTANCE.md` (UNVALIDATED)

I can see these files exist at the root, but I cannot view their contents in this environment.【turn0view0】

**What likely needs to be addressed:**

1. **Promote docs to living artifacts (UNVALIDATED / DESIGN):**
   - `docs/` probably contains the combined project spec and diagrams.
   - `ACCEPTANCE.md` likely lists acceptance criteria for the MVP.
   - `CODE_REVIEW.md` may contain previous review notes or a checklist.
   - Treat all three as **living documents**, not static snapshots:
     - Mark items as DONE / TODO.
     - Cross-link from README (“See `ACCEPTANCE.md` for detailed acceptance criteria”).

2. **Turn CODE_REVIEW into actionable tickets (UNVALIDATED / DESIGN):**
   - Any open issues in `CODE_REVIEW.md` should be copied into GitHub Issues for better tracking and assignment.
   - Keep `CODE_REVIEW.md` focused on *high-level architectural decisions* rather than line-by-line nits that get stale.

3. **Align implementation with spec (UNVALIDATED / DESIGN):**
   - Every feature phase in the spec should map to:
     - A set of routes/components or modules in `src/`.
     - A scenario or acceptance test in `ACCEPTANCE.md`.

**Confidence:** Low–Medium / UNVALIDATED (content not visible; these are process recommendations).

---

## 4. Front-End Architecture & Build (UNVALIDATED)

Because I cannot inspect any file under `src/`, the points below are **architectural recommendations** rather than confirmed issues.

### 4.1 Vite configuration & environment (UNVALIDATED)

Given the README, you’re using plain Vite defaults.【turn0view0】

**Things to check / address:**

- **Index entry point:**
  - Ensure `index.html` uses `<script type="module" src="/src/main.js"></script>` (or equivalent), matching Vite conventions.【turn0view0】
  - After build, confirm that preview works correctly with `npm run preview` and that all asset paths resolve when served from a non-root path (if that’s a requirement).

- **Environment variables:**
  - If you depend on API keys or feature flags, make sure they’re handled via `import.meta.env` and never committed directly.

- **Tree-shaking & dead code:**
  - Keep heavy simulation code and UI code in separate modules so tree-shaking can work effectively.

**Confidence:** Low / UNVALIDATED (cannot see `vite.config`, `main.js`, or `src/`).

---

## 5. macOS Launcher & Tools (UNVALIDATED)

From the README and root layout:【turn0view0】

- There is a compiled app bundle at `mac/StormMaker Launcher.app` and a script at `tools/StormMakerLauncher.applescript`.
- NPM scripts:
  - `npm run launcher:build`
  - `npm run launcher:run`

I cannot see the AppleScript code, but the README describes its behavior:【turn0view0】

> Start `npm run dev`, wait for the URL to respond, open browser, watch tab closure, then shut down the dev server and remove `tools/server.pid`.

### 5.1 Things to verify / improve (UNVALIDATED)

1. **PID handling & orphan processes:**
   - Ensure the script:
     - Kills only the server it started (using the pidfile).
     - Cleans up stale `server.pid` entries on crash or forced quit.
   - Consider a fallback “kill by port” (e.g., port 5173) if the pid is invalid.

2. **Port collisions:**
   - If port 5173 is already in use:
     - Prompt the user, or
     - Attempt a different port, keeping `PORT` in sync with the launched URL.

3. **Logging & error surfacing:**
   - The script should surface failures (e.g., `npm run dev` fails, or the URL never becomes responsive) via explicit dialogs, not silent exit.

4. **Cross-shell compatibility:**
   - On macOS, ensure the script invokes the same shell and environment as your typical dev setup (e.g., zsh, nvm). This often means explicitly sourcing profile files or using `env PATH=...` in the AppleScript / shell wrapper.

**Confidence:** Low / UNVALIDATED (behavior inferred from README, not from script code).

---

## 6. Application Logic & UI (UNVALIDATED)

I cannot see `src/`, `index.html` content, CSS, or any React/vanilla JS components, so the following are **generic “what to audit” items** rather than direct critiques.

### 6.1 Simulation model & state management

**Questions to ask / checks to perform:**

- Is simulation state (storms, swell rings, sampled spot data) centralized in a dedicated store (e.g., a `state` module) rather than scattered across components?
- Do you have a clear separation of concerns between:
  - Physics / simulation (time-stepping, wave propagation).
  - Rendering (canvas drawing, animations).
  - UI state (selected storm, active tab, help overlay, measure tool)?
- Do you support **time scaling** (slow/fast playback) without breaking numeric stability?

### 6.2 Canvas rendering & performance

Audit for:

- **Frame pacing:** Use `requestAnimationFrame` for animations, never `setInterval` for draws, and throttle simulation ticks independent of draw loops if necessary.
- **Allocation hot paths:** Avoid per-frame allocations in tight loops (e.g., large arrays, object creation) inside your render path.
- **Responsiveness:** Check how the app behaves on a mid-range laptop (browsers throttled, multiple tabs) to ensure the UI remains snappy while storms are animating.

### 6.3 Accessibility & keyboard control

From README we know there are keyboard shortcuts (Space, R, M).【turn0view0】

- Ensure buttons are focusable, labeled, and keyboard-operable.
- Verify color choices on the canvas have enough contrast for core indicators and text overlays.
- Provide ARIA labels for controls that are primarily icon-based (if any).

**Confidence:** Low / UNVALIDATED (cannot see implementation; these are suggested review targets).

---

## 7. Testing Strategy (UNVALIDATED)

There is no visible `test/` or `__tests__/` directory in the root listing, nor any mention of tests in the README.【turn0view0】  
This does **not** mean tests don’t exist (they may live under `src/`), so this is **UNVALIDATED**.

**Recommendations:**

1. **Unit tests** for:
   - Core geometry and coordinate transforms (lat/lon ↔ canvas).
   - Storm progression and swell ring propagation logic.
   - Scenario loading and state reset behavior.

2. **Integration / smoke tests:**
   - Use Playwright or Cypress to run simple UI sanity checks:
     - App loads.
     - Storm can be added/dragged.
     - Sites tab shows swell updates after a short simulated time.

3. **Developer diagnostics:**
   - If you have a diagnostics tab or logging view (likely, given the spec), ensure it’s covered by at least one smoke test – e.g., “diagnostics panel appears and reports non-zero FPS after play is pressed.”

**Confidence:** Low–Medium / UNVALIDATED (no test files visible; applying general best practices).

---

## 8. Summary: Concrete Items to Address Next

Sorted by how straightforward they are to fix.

### 8.1 Confirmed / Repository-Level (HIGH confidence)

- **Remove `node_modules/` from version control and add to `.gitignore`.** (VALIDATED)
- **Check for and, if missing, add a LICENSE file** appropriate for your intended usage. (LIKELY, but UNVALIDATED)
- **Ensure README remains the canonical quick-start reference** and cross-link it with `docs/`, `ACCEPTANCE.md`, and `CODE_REVIEW.md`. (VALIDATED presence; content suggestions UNVALIDATED)

### 8.2 Likely but Unseen (MEDIUM / LOW confidence)

- **Add a simple CI pipeline** (GitHub Actions) that runs `npm ci` and `npm run build` on every push/PR.
- **Audit AppleScript-based launcher** for:
  - Robust pid handling.
  - Port collision behavior.
  - Clear error reporting.
- **Review and modernize internal state management and rendering loops** in `src/` for:
  - Clear separation of concerns.
  - Minimal per-frame allocation.
  - Compatibility with time scaling.

### 8.3 Documentation & Process (MEDIUM confidence)

- Treat `ACCEPTANCE.md` as a living acceptance test suite.
- Turn open items in `CODE_REVIEW.md` into GitHub Issues and keep that file focused on architectural notes and decisions.

---

## 9. Validation & Confidence Summary

- **VALIDATED:** Repo root structure, presence of `node_modules/`, existence of `docs/`, `ACCEPTANCE.md`, `CODE_REVIEW.md`, `src/`, `public/`, `tools/`, and main README descriptions about Vite usage and the macOS launcher.【turn0view0】
- **UNVALIDATED:** Any comment about:
  - Code under `src/`, `docs/`, `tools/`.
  - The actual contents of `ACCEPTANCE.md` and `CODE_REVIEW.md`.
  - Internal state management, physics correctness, performance, and UI implementation details.

**Overall confidence for this report as a whole:**

- **High / VALIDATED** for structural and repo-hygiene findings.
- **Low–Medium / UNVALIDATED** for implementation details and suggested improvements that depend on files I could not inspect.

If you’d like a **deeper, line-by-line code review**, you can either:
- Paste specific key files here (`src/main.js`, core state/physics modules, AppleScript launcher), or
- Export them as a single text bundle and I can treat that as the source of truth for a more detailed, *fully validated* review.


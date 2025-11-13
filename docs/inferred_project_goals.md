# Inferred Project Goals

| Goal | Evidence | Confidence |
| --- | --- | --- |
| Deliver a browser-based educational simulation showing how North Pacific storms affect Oʻahu surf. | README summary, combined spec in `docs/`, code focus on storms/spots. | 90 |
| Provide interactive tooling (storm placement, parameter editing, scenarios) for users to experiment with swell generation. | Storms tab, scenario loader, measure tool implementation. | 85 |
| Maintain lightweight stack (vanilla JS + Vite) with optional macOS launcher for easy local demos. | `package.json` scripts, `tools/StormMakerLauncher.applescript`. | 75 |
| Ensure smooth performance (30–60 fps) and responsive UX across desktop viewpoints. | Spec references, diagnostics panel, canvas resizing logic. | 70 |

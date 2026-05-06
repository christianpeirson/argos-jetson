# GNU Radio noVNC Tile — Design Spec

**Date:** 2026-05-04
**Branch:** `feature/session-4`
**Status:** Approved (user confirmed 2026-05-04)
**Scope target:** SvelteKit dev server on `http://localhost:5173` only — no prod build, no `argos-final.service` (`:5174`)

## 1. Goal

Add a "GNU Radio" tile under **Tools → Offnet → Utilities → Signal Recording & Analysis** that, when started, streams `gnuradio-companion` (the GNU Radio Companion GUI, hereafter **GRC**) into a noVNC iframe inside the dashboard. UX must match the existing Wireshark tile 1:1 — same start/stop/status verbs, same iframe panel pattern, same offnet placement.

## 2. Non-goals (out of scope for this spec)

- gr-mcp install + integration (deferred until after Phase 5 user demo; explicit user decision gate)
- Programmatic block creation via mouse-coord automation through the noVNC `<canvas>` (Agent D research ruled LOW feasibility — single rasterized canvas, no DOM hooks)
- Saved-flowgraph library / persistence
- Production-build wiring (`argos-final.service`, port 5174)
- Multi-tenant: only one GRC session at a time, host-wide

## 3. Architecture

Three-process stack identical to `src/lib/server/services/wireshark-vnc/`:

```
┌─────────────────────── jetson2 host ───────────────────────┐
│  Xtigervnc :95     ←── DISPLAY=:95 ──── gnuradio-companion │
│  (port 5995, localhost-only, SecurityTypes None)           │
│                                                            │
│  websockify 6084  ←──── tcp ────→  localhost:5995          │
└────────────────────────────────────────────────────────────┘
                                ▲
                                │ ws://<host>:6084 (noVNC)
                                │
                       SvelteKit :5173 iframe
                       (Tools → Offnet → Utilities →
                        Signal Recording & Analysis →
                        "GNU Radio" tile)
```

**Process roles:**

- **Xtigervnc** — virtual X server painting a desktop into RAM; flag: `-SecurityTypes None -localhost`. Same flags Wireshark uses.
- **gnuradio-companion** — GTK editor for GNU Radio flowgraphs (GTK3 default in 3.10.x; `--qt` opts into experimental Qt5 frontend). Launches with `DISPLAY=:95 QT_QPA_PLATFORM=xcb gnuradio-companion --log info [optional /path/to/file.grc]`.
- **websockify** — TCP↔WebSocket bridge, `5995 ⇄ 6084`. Bare-proxy mode (no `--web` flag — SvelteKit serves `vnc.html` from `static/novnc/`, mirroring Wireshark).

**Why `QT_QPA_PLATFORM=xcb`** — GRC's default editor framework is GTK (per `grc/main.py` argparse: `--qt | --gtk`, GTK default), but Qt sinks instantiated by _running_ flowgraphs (`qt_sink`, `qt_freq_sink`, `qt_time_sink`) spawn child Qt windows. Wayland Qt backend hangs under TigerVNC; xcb forces the legacy X11 path which works.

## 4. Port + display allocation

Following the descending pattern (`:99→6080`, `:98→6081`, `:97→6082`, `:96→6083`):

| Display | VNC port | WS port  | Service                   |
| ------- | -------- | -------- | ------------------------- |
| :99     | 5999     | 6080     | WebTAK                    |
| :98     | 5998     | 6081     | Sparrow-WiFi              |
| :97     | 5997     | 6082     | SDR++                     |
| :96     | 5996     | 6083     | Wireshark                 |
| **:95** | **5995** | **6084** | **GNU Radio (this spec)** |

Geometry: `1920x1080x24`, depth 24 — matches Wireshark.

## 5. File layout (mirrors `wireshark-vnc/` 1:1)

```
src/lib/server/services/gnu-radio-vnc/
  gnu-radio-vnc-types.ts         # ports/display/paths/env constants + types
  gnu-radio-vnc-processes.ts     # spawn Xvnc + grc + websockify; PID tracking via globalThis
  gnu-radio-vnc-control-service.ts # start/stop/status orchestration
src/routes/api/gnuradio/control/+server.ts   # POST {action, flowgraph?}
src/lib/components/dashboard/GnuRadioVncPanel.svelte # iframe + start/stop button
src/lib/data/offnet-utilities.ts            # add tile under signal-recording
src/app.d.ts                                 # extend globalThis.__argos_gnuradioVnc_state
```

`vnc-common/resolve-bin.ts` is reused (no edit needed) — provides env-override-aware binary resolution for `Xtigervnc`, `websockify`, and now `gnuradio-companion`.

## 6. Install plan (Phase 1)

```bash
sudo add-apt-repository ppa:gnuradio/gnuradio-releases
sudo apt update
sudo apt install gnuradio python3-packaging gr-osmosdr \
                 libxcb-xinerama0 libxcb-icccm4 libxcb-image0 \
                 libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 \
                 libxcb-shape0 libxcb-cursor0
```

**Source:** Agent A research, citing GNU Radio Wiki Quick Start + Launchpad PPA build #26429070.

- **PPA `ppa:gnuradio/gnuradio-releases`** ships `3.10.7` for jammy aarch64 (verified). `jammy/universe` only carries `3.10.1.1`. PPA wins.
- `gr-osmosdr` (jammy/universe, not in PPA) enables HackRF / RTL-SDR blocks for later flowgraphs.
- xcb plugin libs explicit-install because the Qt5 flowgraph sinks need them and Wayland-only Jetson installs sometimes lack them.
- **Footprint:** ~750 MB disk (incl. UHD/volk auto-pulled), ~180 MB RAM idle / ~400 MB-1 GB running.
- **Python module path:** `/usr/lib/python3/dist-packages/gnuradio/` — Debian convention.

**Pre-install verification gate** (per workflow Rule 8 + memory `feedback_install_docs_gate.md`): touch the install-docs marker after fetching official wiki page, before running `apt install`.

## 7. Control endpoint contract

```ts
POST /api/gnuradio/control
Body (Zod-validated, discriminated union on `action`):
  { action: "start", flowgraph?: string }   // optional .grc path preload
  { action: "stop" }
  { action: "status" }

Response:
  { success: true, pid?: number, vncPort: 5995, wsPort: 6084, flowgraph?: string }
  { success: false, error: string }
```

`flowgraph` validation:

- Must be an absolute path
- Must exist + be a regular file (not a symlink to outside `/tmp/` or `/home/jetson2/`)
- Must end in `.grc`
- Path-traversal blocked via `path.resolve` + prefix check

Identical Zod schema shape + `createHandler` + `resultStatus` helpers as Wireshark control endpoint.

## 8. Frontend — tile + panel

**Tile entry** in `src/lib/data/offnet-utilities.ts` under `signal-recording` category:

```ts
{ id: 'gnu-radio',
  name: 'GNU Radio',
  description: 'GRC flowgraph editor streamed via noVNC',
  icon: 'Radio',                  // lucide
  componentKey: 'gnu-radio-vnc',  // wires to GnuRadioVncPanel
  apiPath: '/api/gnuradio/control'
}
```

**`GnuRadioVncPanel.svelte`** mirrors `WiresharkVncPanel.svelte`:

- Start / Stop buttons calling control endpoint
- Status badge driven by `status` action
- iframe with `src="/novnc/vnc.html?host=${location.hostname}&port=6084&autoconnect=1&resize=remote&reconnect=1"` once running
- iframe `sandbox="allow-scripts allow-same-origin"`
- Loading spinner during start (~3-5 s warmup)

## 9. Lifecycle

**Start sequence** (matches Wireshark `startWiresharkVnc`):

1. If state already running → return current status
2. Resolve binaries via `resolveBin` chain
3. Spawn Xtigervnc, wait for VNC port `5995` to accept TCP
4. Spawn websockify on `6084 → localhost:5995`
5. Spawn `gnuradio-companion` with `DISPLAY=:95 QT_QPA_PLATFORM=xcb`, optional positional `flowgraph` arg
6. Pin all 3 process refs into `globalThis.__argos_gnuradioVnc_state` (survives Vite HMR)
7. Return `{ success, vncPort, wsPort, flowgraph? }`

**Stop sequence:** SIGTERM grc → SIGTERM websockify → SIGTERM Xtigervnc → wait/SIGKILL fallback after 2 s — same as Wireshark `stopWiresharkVnc`. Clear globalThis state.

**Status:** introspect globalThis state + `process.kill(pid, 0)` liveness checks. No port pings.

## 10. Test plan

### Phase 4 — smoke test (chrome-devtools MCP)

1. `mcp__chrome-devtools__navigate_page http://localhost:5173/dashboard`
2. Click `Tools` → `Offnet` → `Utilities` → `Signal Recording & Analysis` → `GNU Radio`
3. Click **Start**
4. `wait_for` iframe ready (poll for `<iframe src*="vnc.html">` + 5 s grace)
5. `take_screenshot` — assert GRC window visible (sanity-check screenshot bytes > 50 KB)
6. `pgrep -af 'Xtigervnc :95|gnuradio-companion|websockify.*6084'` returns 3 PIDs
7. Click **Stop**, `take_screenshot` again, assert iframe disconnected
8. `pgrep` returns empty

### Phase 5 — programmatic block demo (gated on user watching, deferred)

1. Pre-author `/tmp/argos-grc-demo.grc` (~50 LOC YAML, `analog_sig_source_x → blocks_throttle2 → blocks_null_sink`)
2. Click Start with `flowgraph: "/tmp/argos-grc-demo.grc"`
3. User confirms 3 blocks visible on canvas
4. **Decision gate:** ship-it / iterate / install gr-mcp

## 11. Risk + mitigation

| Risk                                           | Mitigation                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `add-apt-repository` adds GPG key over network | Explicit user approval before run (CLAUDE.md "no install without approval"); fallback to manual key download |
| PPA jammy aarch64 build broken on Jetson       | Fallback to `apt install gnuradio` from jammy/universe (3.10.1.1) — slightly older but distro-supported      |
| GRC startup latency >10 s on first launch      | Splash visible inside iframe; if user complains, add backend warmup probe before iframe loads                |
| Vite HMR loses process refs                    | `globalThis` pinning + state typed in `src/app.d.ts` (proven pattern in wireshark-vnc)                       |
| Port 6084 collision with future tile           | Reserve in port-allocation table comment in `gnu-radio-vnc-types.ts`                                         |
| Xtigervnc package name on Jetson               | Already verified working for Wireshark (`/usr/bin/Xtigervnc`); same binary, no extra install                 |

## 12. Phase ordering + sentrux brackets

Per workflow Rule 6 (sentrux per-PR bracketing) and Rule 10 (batched-commit cadence):

1. **Branch creation** → `mcp__plugin_sentrux_sentrux__session_start` baseline
2. **Phase 1** — apt install (no commit, host state only)
3. **Phase 2** — service trio commit
4. **Phase 3** — endpoint + tile commit
5. **Phase 4** — smoke test commit (test artifacts only)
6. **Phase 5** — `.grc` demo file + user demo (commit gated on user approval)
7. **Pre-merge** → `rescan` + `session_end` + `check_rules`; `quality_signal` must not regress

Local quality gates between phases (eslint scoped to touched files + `svelte-check` only on structural type changes).

## 13. Acceptance criteria

- [ ] Phase 4 smoke test green via chrome-devtools — GRC GUI visible in noVNC iframe at `:5173`
- [ ] Stop action cleans up all 3 processes (`pgrep` returns empty)
- [ ] Re-Start after Stop works (no orphaned X lock files)
- [ ] No regression in `quality_signal` from sentrux baseline
- [ ] No new ESLint / `svelte-check` errors on touched files
- [ ] Wireshark tile still works (regression check — same `vnc-common/resolve-bin.ts` is shared)

---

**Decision log**

- 2026-05-04 — User chose option **C** (smoke test + visual confirmation; programmatic block creation deferred to Phase 5 with user watching, gr-mcp gated on Phase 5 outcome).
- 2026-05-04 — User confirmed scope is `:5173` only (dev server), no prod wiring.

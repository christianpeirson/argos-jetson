# Phase 9.6 Parity Audit — KISMET / GSM / SYSTEMS / MAP

Audit-only. Live = `src/lib/components/screens/`. Design = `/tmp/argos-design/src/`.

## 1. KISMET

Live: `src/lib/components/screens/ScreenKismet.svelte` (234 LOC, 2-pane).
Design: `screen-kismet.jsx` (4-pane: SCN-01 tool / FLT-02 filters / DEV-03 table / INS-04 inspector).

| Feature                | Design Has                                                                                                          | Live Has                                                                                             | Severity | Notes                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| Tool/control bar (CTL) | CAPTURE/HALT/EXPORT-PCAP buttons + DEVICES/APs/STAs/ALERTS metric chips + CH ribbon (`screen-kismet.jsx:23-55`)     | none                                                                                                 | high     | Whole top SCN-01 panel missing; Kismet has no in-screen capture/halt UX. |
| Filters panel (FLT-02) | BAND/TYPE/ENCRYPTION/RSSI/VENDOR groups w/ counts (`:58-66`)                                                        | none                                                                                                 | high     | Left filter rail absent — chassis `Accordion` + `Tag` can build it.      |
| Device row decoration  | leading status dot (alert ▲ / strong ● / weak ○) per `:80-82`                                                       | mac/vendor/ssid/ch/rssi/seen only (`ScreenKismet.svelte:113-119`)                                    | med      | No alert/strength indicator column.                                      |
| Table columns          | BAND, TYPE, ENC, PKTS in addition to live's set (`:73-74`)                                                          | absent                                                                                               | med      | Add columns; chassis `DataTable` would normalise.                        |
| Inspector richness     | RSSI sparkline 200s + PEAK/MEAN metrics + KV grid + 5 actions (LOCK/DEAUTH/PCAP/TRIANGULATE/BLACKLIST) (`:139-185`) | 5 actions only (PCAP/TRIANG/DEAUTH/BLACKLIST + 1 — no LOCK CHANNEL) (`KismetInspector.svelte:19-22`) | high     | No sparkline, no peak/mean, no LOCK CHANNEL action, no SUSPECT pill.     |
| Layout                 | 3-column main (filters / table / inspector)                                                                         | 2-col (table / inspector)                                                                            | high     | Restructure when FLT-02 lands.                                           |

## 2. GSM-EVIL

Live: `src/lib/components/screens/ScreenGsm.svelte` (45 LOC).
Design: `screen-gsm.jsx` (5-pane: CTL-01 / MTR-02 / IMS-03 / INS-04 / CON-05).

| Feature               | Design Has                                                                                                                                      | Live Has                                                                           | Severity               | Notes                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------- | ---- | -------------------------------- |
| Control bar (CTL-01)  | START SCAN / HALT / RETUNE / CSV + ARFCN/FREQ/GAIN/PPM range fields + scan-runtime pill (`screen-gsm.jsx:31-49`)                                | FrequencyTuner only (no scan/halt/csv)                                             | high                   | Add transport buttons + runtime pill; chassis `RfRangeReadout` covers fields. |
| Metrics row (MTR-02)  | 6 cells: UNIQUE IMSI / FRAMES·MIN / CARRIERS / ROAMERS / FLAGGED / %ERR (`:51-62`)                                                              | none                                                                               | high                   | New row above table; chassis `Tile`.                                          |
| IMSI table columns    | adds CN, TMSI, LAC, CI, DWELL, leading flag/roamer dot (`:67-89`)                                                                               | check `ImsiTable` — limited columns                                                | med                    | Audit + extend; need ▲/◆/○ leading column for flag/roamer/normal.             |
| Inspector             | classification eyebrow (FLAGGED/ROAMER/SUBSCRIBER) + 5 actions incl. SIM LOOKUP + KV w/ MCC/MNC/TMSI/LAC/CI/ARFCN/FIRST/LAST/DWELL (`:136-167`) | 5 actions present (TRACK/TAG/EXPORT/SIM-LOOKUP/FLAG) (`GsmInspector.svelte:16-20`) | low                    | Verify KV row coverage — likely small delta.                                  |
| Console feed (CON-05) | live event stream w/ T/LVL/M columns, IMSI/SYS/FLAG levels (`:100-113`)                                                                         | none                                                                               | high                   | Whole bottom panel missing; chassis `StructuredList` possible host.           |
| Layout                | 4-row split (ctl/mtr/[tbl                                                                                                                       | ins]/console)                                                                      | 2-region (tuner / [tbl | ins])                                                                         | high | Add metric strip + console band. |

## 3. SYSTEMS

Live: `SystemsScreen.svelte` (316 LOC) + 5 tab parts.
Design: `systems-overview.jsx` (353 LOC).

| Feature                 | Design Has                                                                                                | Live Has                                   | Severity | Notes                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------- | -------------------------------------------------------- |
| Header right-side stats | UPTIME / LOAD / N OK / N WARN w/ dots (`:107-112`)                                                        | identical (`SystemsScreen.svelte:140-156`) | —        | Parity.                                                  |
| Tabs                    | host/hw/proc/svc/net w/ counts (`:115-127`)                                                               | identical (`:160-173`)                     | —        | Parity.                                                  |
| HOST METRICS sparklines | 4 cards (CPU/MEM/NETWORK/CORE TEMP) w/ rolling sparkline + alarm flag (`HostMetrics`)                     | Verify `HostMetricsTab` — likely partial   | med      | Confirm sparkline coverage; design uses 220×32 SVG path. |
| Disk usage block        | filled bars for / · /var/cap · /opt/argos w/ pct + hot threshold (`:179-204`)                             | unknown — verify `HostMetricsTab`          | med      | If absent add ProgressBar rows.                          |
| Hardware table          | leading status dot, name+detail, BUS, SERIAL/ID, STATE coloured, kebab (`:210-237`)                       | verify `HardwareTab`                       | low      | Tag/Dot likely already used; check kebab/more action.    |
| Process table           | sortable headers w/ ↑/↓, summary strip TOTAL/RUN/SLEEP/CPUΣ/MEMΣ, root highlighted, tag pill (`:240-300`) | verify `ProcessesTab`                      | high     | Sort UI + summary strip likely missing.                  |
| Service actions         | Restart/Stop/Logs icon buttons per row (`:316-322`)                                                       | verify `ServicesTab`                       | high     | If actions absent, add icon-btn cluster.                 |
| Network table           | RX/TX MB/s + ERR coloured (`:330-351`)                                                                    | verify `NetworkTab`                        | low      | Likely close to parity.                                  |

(7 of 8 rows need confirmation against the 5 tab files — flagged at design-fidelity severity, not as confirmed gaps.)

## 4. MAP

Live: `src/lib/components/screens/MapScreen.svelte` (280 LOC) — MapLibre + RF heatmap/centroids/path/highlight + GPS marker + bearing rays + LayerChips.
Design: **no `screen-map.jsx`** in archive. `primitives.jsx:36-54` only contains `KV.map(...)` and Sparkline coord helpers — no map-screen primitive. `app.jsx` may reference layout chrome but no map-specific design contract.

| Feature                  | Design Has | Live Has  | Severity | Notes                                                     |
| ------------------------ | ---------- | --------- | -------- | --------------------------------------------------------- |
| Map screen design source | none       | full impl | —        | No design-parity gap can be asserted; MAP is live-driven. |

Action: skip MAP from 9.6 parity scope. Defer any map-chrome work to a future sub-phase that has a design source.

## Summary punch-list (severity-ranked)

**HIGH (blockers for design parity):**

1. KISMET — add CTL-01 tool bar + FLT-02 filter rail + 3-col layout.
2. KISMET — inspector RSSI sparkline + PEAK/MEAN + LOCK CHANNEL action + SUSPECT pill.
3. GSM — add CTL-01 transport buttons + scan-runtime pill.
4. GSM — add MTR-02 6-cell metrics row.
5. GSM — add CON-05 live console band.
6. GSM — restructure to 4-row split.
7. SYSTEMS — process table sort UI + summary strip (verify, likely missing).
8. SYSTEMS — service-row actions (Restart/Stop/Logs icons; verify).

**MED:**

- KISMET row leading status dot column.
- KISMET table: BAND/TYPE/ENC/PKTS columns.
- GSM table leading flag/roamer dot.
- SYSTEMS host sparklines + disk-usage bars (verify).

**LOW:**

- GSM inspector KV row coverage delta.
- SYSTEMS hardware kebab + network err colouring.

**OUT OF SCOPE:** MAP (no design source).

Chassis hooks: `DataTable` (Kismet+GSM tables), `Tile` (GSM metrics), `Tag` (filters/badges), `ProgressBar` (disk usage), `Accordion` (Kismet filter groups), `StructuredList` (GSM console band), `RfRangeReadout` (GSM CTL fields).

---

## 9.7 audit — Mission CRUD / Weather / Sparkline

**Discovery: all three plan items are substantially already shipped.**

| Item                   | Status                                      | Notes                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/missions/*` CRUD | ✅ shipped                                  | `POST /api/missions` (create), `GET /api/missions/list` (list), `GET/PATCH/DELETE /api/missions/[id]`, `POST /api/missions/[id]/activate`. SQLite-backed via `mission-repository.ts` + `mission-store.ts`. `missionStore` rune at `src/lib/state/missions.svelte.ts` polls + mutates.                                  |
| `MissionStrip.svelte`  | ✅ shipped, **schema diverges from design** | Live cells: ENGAGEMENT / OPERATOR / TARGET / TIMER / LINK BUDGET. Design cells: MISSION / POSTURE / ELAPSED / TEAM / DETECTIONS. Mission types conceptually different (live=sitrep with operator/target; design=posture-driven engagement). Reconciliation requires schema migration + backend rewrite — **deferred**. |
| Weather popover        | ✅ shipped                                  | `chassis/WeatherButton.svelte` + `chassis/WeatherPanel.svelte` (spec-024 PR1 T011). VFR/MVFR/IFR/LIFR color mapping via `CAT_STROKE`. METAR cache at `src/lib/server/services/weather/metar-cache.ts`. No `WeatherPopover.svelte` rename needed.                                                                       |
| Sparkline plumbing     | ✅ shipped                                  | `Sparkline.svelte` (spec-024 PR2 T016) consumed by `SensorTile.svelte` + `MetricCard.svelte`. Real telemetry flows in `OverviewSensors.svelte` from `/api/rf/stream`, `/api/kismet/devices`, `/api/gps/satellites`, `/api/system/metrics` via `pushSample()` + `METRIC_WINDOW` rolling buffers.                        |

**Conclusion:** Phase 9.7 has zero net-new chassis or backend work. The plan was authored against an outdated state of the codebase — what it called for has already been done.

**Deferred item:** MissionStrip cell-schema reconciliation with design's posture-driven model. Scope is non-trivial (mission-store schema + backend repository + UI rewrite); the live model is operationally richer (editable operator/target/link-budget vs read-only design status). **Recommend deferring** to a separate spec or accepting the divergence as "live model wins for tactical depth, design wins for at-a-glance posture display".

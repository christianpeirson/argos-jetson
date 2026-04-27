#!/bin/bash
# auto_sweep.sh — HackRF sweep wrapper for legacy /api/rf/start-sweep consumers.
#
# B205 / USRP spectrum is handled by src/lib/server/spectrum/b205-source.ts via
# POST /api/spectrum/start {device:'b205',...}; the Python sidecar at
# scripts/spectrum/b205_spectrum.py owns that path. This script intentionally
# does NOT auto-detect USRP devices anymore — the prior USRP branch referenced
# a `usrp_spectrum_scan.py` script that was never added to the repo and would
# always fail at runtime if a B205 was attached alongside HackRF.
#
# This script is co-located with `mock_sweep.sh` for the no-hardware fallback.
# Spawn site: src/lib/hackrf/sweep-manager/process-manager.ts:resolveScriptPath().

# UHD images dir (harmless on HackRF-only systems; required by uhd-host probes)
export UHD_IMAGES_DIR=/usr/share/uhd/images

if hackrf_info 2>/dev/null | grep -q "Serial number"; then
    echo "HackRF detected" >&2
    # Try python_hackrf sweep bridge first (native API, no subprocess overhead).
    # Path is best-effort; falls through to the hackrf_sweep binary if the
    # bridge module isn't available.
    SWEEP_BRIDGE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../external/hackrf_emitter/backend/sweep_bridge.py"
    if [[ -f "$SWEEP_BRIDGE" ]] && python3 -c "from python_hackrf import pyhackrf_sweep" 2>/dev/null; then
        echo "Using python_hackrf sweep bridge" >&2
        export PYTHONUNBUFFERED=1
        exec python3 -u "$SWEEP_BRIDGE" "$@"
    else
        echo "Falling back to hackrf_sweep binary" >&2
        exec hackrf_sweep "$@"
    fi
else
    echo "Warning: No HackRF device found" >&2
    echo "Running in mock mode for testing..." >&2
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    exec "$SCRIPT_DIR/mock_sweep.sh" "$@"
fi

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / ".github/workflows/geoai-quality-gate.yml"
source = PATH.read_text(encoding="utf-8")

if 'expected_location["/explore"]="/workspace"' in source and "lighthouse-desktop-workspace-criteria.json" in source:
    print("CR 10.08 Quality Gate sync is already applied.")
    raise SystemExit(0)

source = source.replace(
    "artifacts/lighthouse-desktop-explore.json",
    "artifacts/lighthouse-desktop-workspace-criteria.json",
)

old_lighthouse = "npx lighthouse http://127.0.0.1:3000/explore \\\\"
new_lighthouse = "npx lighthouse http://127.0.0.1:3000/workspace \\\\"
if old_lighthouse not in source:
    old_lighthouse = "npx lighthouse http://127.0.0.1:3000/explore \\\n"
    new_lighthouse = "npx lighthouse http://127.0.0.1:3000/workspace \\\n"
if old_lighthouse not in source:
    raise RuntimeError("Quality Gate Explore Lighthouse invocation was not found")
source = source.replace(old_lighthouse, new_lighthouse, 1)

status_marker = '          expected_status["/demo"]="307"\n'
location_marker = '          expected_location["/demo"]="/workspace"\n'
if source.count(status_marker) != 1:
    raise RuntimeError("Quality Gate demo status marker was not found once")
if source.count(location_marker) != 1:
    raise RuntimeError("Quality Gate demo location marker was not found once")

source = source.replace(
    status_marker,
    status_marker + '          expected_status["/explore"]="307"\n',
    1,
)
source = source.replace(
    location_marker,
    location_marker + '          expected_location["/explore"]="/workspace"\n',
    1,
)

PATH.write_text(source, encoding="utf-8")
print("CR 10.08 Quality Gate sync applied.")

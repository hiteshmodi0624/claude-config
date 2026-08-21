import bpy
import json
import os
import sys
from pathlib import Path


def cli_arg(name, default=None):
    if "--" not in sys.argv:
        return default
    args = sys.argv[sys.argv.index("--") + 1:]
    if name in args:
        i = args.index(name)
        return args[i + 1]
    return default

bundle_dir = Path(cli_arg("--bundle-dir", ".")).resolve()
out_path = Path(cli_arg("--out", "asset_inventory.json")).resolve()

records = []
for blend_path in sorted(bundle_dir.rglob("*.blend")):
    rec = {"path": str(blend_path.relative_to(bundle_dir))}
    try:
        with bpy.data.libraries.load(str(blend_path), link=False) as (data_from, data_to):
            rec["objects"] = list(data_from.objects)
            rec["collections"] = list(data_from.collections)
            rec["armatures"] = list(data_from.armatures)
            rec["meshes"] = list(data_from.meshes)
            rec["actions"] = list(data_from.actions)
    except Exception as exc:
        rec["error"] = repr(exc)
    records.append(rec)

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
print(json.dumps(records, indent=2))

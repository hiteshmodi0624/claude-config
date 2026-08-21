import bpy, json, sys
from pathlib import Path

out = Path(sys.argv[sys.argv.index('--')+2]) if '--' in sys.argv and len(sys.argv) > sys.argv.index('--')+2 else Path('rigify_inventory.json')
bpy.ops.preferences.addon_enable(module='rigify')
bpy.ops.object.armature_human_metarig_add()
meta = bpy.context.object
for pb in meta.pose.bones:
    if pb.rigify_type == 'limbs.super_finger':
        try:
            pb.rigify_parameters.make_extra_ik_control = True
            pb.rigify_parameters.ik_local_location = False
        except Exception:
            pass
meta_dims = list(meta.dimensions)
meta_bones = list(meta.data.bones.keys())
bpy.context.view_layer.objects.active = meta
meta.select_set(True)
bpy.ops.pose.rigify_generate()
rig = bpy.context.object
records = {
    'metarig_name': meta.name,
    'metarig_dimensions': meta_dims,
    'metarig_bones': meta_bones,
    'rig_name': rig.name,
    'rig_dimensions': list(rig.dimensions),
    'pose_bones': [],
}
for pb in rig.pose.bones:
    if any(k in pb.name for k in ('hand','upper_arm','forearm','thigh','shin','foot','toe','spine','chest','torso','shoulder','pelvis','hips','f_index','f_middle','f_ring','f_pinky','thumb')):
        records['pose_bones'].append({
            'name': pb.name,
            'parent': pb.parent.name if pb.parent else None,
            'custom_props': list(pb.keys()),
            'constraints': [{'name': c.name, 'type': c.type, 'target': c.target.name if getattr(c,'target',None) else None, 'subtarget': getattr(c,'subtarget','')} for c in pb.constraints],
            'head': list(pb.head), 'tail': list(pb.tail),
        })
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(records,indent=2),encoding='utf-8')
print(json.dumps(records,indent=2))

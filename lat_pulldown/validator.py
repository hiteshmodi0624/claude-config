"""Fail-closed validator for the deterministic lat-pulldown Blender build.

The build deliberately keeps this module independent from motion generation. It
validates evaluated scene state, not authoring inputs. Any failure raises
ValidationError and the Blender process exits non-zero.
"""
from __future__ import annotations

import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector

EPS_POS = 2.0e-5
EPS_LEN = 3.0e-5
EPS_ANGLE = math.radians(0.08)
EPS_DRIVER = 2.0e-6
PAD_MIN = -0.004
PAD_MAX = 0.0015

class ValidationError(RuntimeError):
    pass

@dataclass
class Failure:
    frame: int
    check: str
    detail: str

def v3(obj) -> Vector:
    return obj.matrix_world.translation.copy()

def pose_point_world(rig, bone_name: str, tail: bool=False) -> Vector:
    pb = rig.pose.bones[bone_name]
    p = pb.tail if tail else pb.head
    return rig.matrix_world @ p

def evaluated_bone_length(rig, bone_name: str) -> float:
    return (pose_point_world(rig, bone_name, True) - pose_point_world(rig, bone_name, False)).length

def find_limit_constraint(pb):
    return [c for c in pb.constraints if c.type == 'LIMIT_ROTATION' and c.influence > 0.999]

def check_joint_limits(frame, rig, joint_specs, failures):
    for spec in joint_specs:
        name = spec['bone']
        if name not in rig.pose.bones:
            failures.append(Failure(frame, 'joint_angle', f'missing bone {name}')); continue
        pb = rig.pose.bones[name]
        cons = find_limit_constraint(pb)
        if not cons:
            failures.append(Failure(frame, 'joint_angle', f'{name}: missing Limit Rotation constraint')); continue
        e = pb.matrix_basis.to_euler('XYZ')
        for axis, val, mn, mx in zip('XYZ', (e.x,e.y,e.z), spec['min'], spec['max']):
            if val < mn-EPS_ANGLE or val > mx+EPS_ANGLE:
                failures.append(Failure(frame, 'joint_angle', f'{name}.{axis}={math.degrees(val):.3f}deg outside [{math.degrees(mn):.3f},{math.degrees(mx):.3f}]'))

def check_bone_lengths(frame, rig, rest_lengths, failures):
    for name, rest_len in rest_lengths.items():
        if name not in rig.pose.bones:
            failures.append(Failure(frame, 'bone_length', f'missing bone {name}')); continue
        cur = evaluated_bone_length(rig, name)
        if abs(cur-rest_len) > EPS_LEN:
            failures.append(Failure(frame, 'bone_length', f'{name}: {cur:.8f} vs rest {rest_len:.8f}'))

def check_chain_connections(frame, rig, connections, failures):
    for parent, child in connections:
        if parent not in rig.pose.bones or child not in rig.pose.bones:
            failures.append(Failure(frame, 'dislocation', f'missing {parent}->{child}')); continue
        d = (pose_point_world(rig,parent,True)-pose_point_world(rig,child,False)).length
        if d > EPS_POS:
            failures.append(Failure(frame, 'dislocation', f'{parent}->{child}: head/tail gap {d:.8g}m'))

def check_hand_grips(frame, rig, grip_pairs, failures):
    for bone_name, target_name in grip_pairs:
        if bone_name not in rig.pose.bones or target_name not in bpy.data.objects:
            failures.append(Failure(frame, 'hand_grip', f'missing {bone_name} or {target_name}')); continue
        d = (pose_point_world(rig,bone_name,False)-v3(bpy.data.objects[target_name])).length
        if d > EPS_POS:
            failures.append(Failure(frame, 'hand_grip', f'{bone_name}->{target_name}: {d:.8g}m'))

def check_fingertip_contacts(frame, rig, finger_pairs, failures):
    for bone_name, target_name in finger_pairs:
        if bone_name not in rig.pose.bones or target_name not in bpy.data.objects:
            failures.append(Failure(frame, 'finger_contact', f'missing {bone_name} or {target_name}')); continue
        d = (pose_point_world(rig,bone_name,True)-v3(bpy.data.objects[target_name])).length
        if d > 7.5e-4:
            failures.append(Failure(frame, 'finger_contact', f'{bone_name}->{target_name}: {d:.8g}m'))

def check_foot_velocity(frame, foot_names, prev, failures, fps):
    cur = {}
    for name in foot_names:
        if name not in bpy.data.objects:
            failures.append(Failure(frame, 'foot_velocity', f'missing {name}')); continue
        p = v3(bpy.data.objects[name]); cur[name]=p
        if name in prev:
            vel = (p-prev[name]).length*fps
            if vel > EPS_POS*fps:
                failures.append(Failure(frame, 'foot_velocity', f'{name}: {vel:.8g} m/s'))
    return cur

def check_pad_contact(frame, thigh_markers, pad_name, failures):
    if pad_name not in bpy.data.objects:
        failures.append(Failure(frame,'pad_contact',f'missing {pad_name}')); return
    pad=bpy.data.objects[pad_name]
    pad_bottom=pad.matrix_world.translation.z-0.5*pad.dimensions.z
    for marker in thigh_markers:
        if marker not in bpy.data.objects:
            failures.append(Failure(frame,'pad_contact',f'missing {marker}')); continue
        signed=bpy.data.objects[marker].matrix_world.translation.z-pad_bottom
        if signed<PAD_MIN or signed>PAD_MAX:
            failures.append(Failure(frame,'pad_contact',f'{marker}: signed contact {signed:.8g}m not in [{PAD_MIN},{PAD_MAX}]'))

def check_cable(frame, names, failures):
    top=bpy.data.objects[names['pulley_anchor']]; bottom=bpy.data.objects[names['bar_anchor']]; cable=bpy.data.objects[names['cable']]
    expected=(v3(top)-v3(bottom)).length; actual=cable.dimensions.z
    if abs(actual-expected)>EPS_DRIVER:
        failures.append(Failure(frame,'cable_length',f'actual {actual:.9f} expected {expected:.9f}'))
    expected_mid=(v3(top)+v3(bottom))*0.5
    if (v3(cable)-expected_mid).length>EPS_DRIVER:
        failures.append(Failure(frame,'cable_length',f'midpoint error {(v3(cable)-expected_mid).length:.9g}m'))

def check_stack(frame, controller, bar, stack, machine_cfg, failures):
    p=float(controller[machine_cfg['scalar_property']])
    expected_bar_z=machine_cfg['bar_top_z']-machine_cfg['bar_travel']*p
    expected_stack_z=machine_cfg['stack_base_z']+machine_cfg['stack_travel']*p
    if abs(bar.matrix_world.translation.z-expected_bar_z)>EPS_DRIVER:
        failures.append(Failure(frame,'bar_scalar',f'bar z {bar.matrix_world.translation.z:.9f} expected {expected_bar_z:.9f}'))
    if abs(stack.matrix_world.translation.z-expected_stack_z)>EPS_DRIVER:
        failures.append(Failure(frame,'stack_height',f'stack z {stack.matrix_world.translation.z:.9f} expected {expected_stack_z:.9f}'))

def validate_scene(log_path=None, planted_failure=False):
    scene=bpy.context.scene; cfg=json.loads(scene['LAT_PULLDOWN_VALIDATION'])
    rig=bpy.data.objects[cfg['rig']]; controller=bpy.data.objects[cfg['controller']]; bar=bpy.data.objects[cfg['bar']]; stack=bpy.data.objects[cfg['stack']]
    failures=[]; prev_feet={}; fps=scene.render.fps/scene.render.fps_base
    planted_obj=planted_old=None
    if planted_failure:
        planted_obj=bpy.data.objects[cfg['grip_pairs'][0][1]]; planted_old=planted_obj.location.copy(); planted_obj.location.x+=0.0123; bpy.context.view_layer.update()
    for frame in range(scene.frame_start,scene.frame_end+1):
        scene.frame_set(frame); bpy.context.view_layer.update()
        check_joint_limits(frame,rig,cfg['joint_specs'],failures)
        check_bone_lengths(frame,rig,cfg['rest_lengths'],failures)
        check_chain_connections(frame,rig,[tuple(x) for x in cfg['connections']],failures)
        check_hand_grips(frame,rig,[tuple(x) for x in cfg['grip_pairs']],failures)
        check_fingertip_contacts(frame,rig,[tuple(x) for x in cfg.get('finger_pairs',[])],failures)
        prev_feet=check_foot_velocity(frame,cfg['foot_markers'],prev_feet,failures,fps)
        check_pad_contact(frame,cfg['thigh_markers'],cfg['pad'],failures)
        check_cable(frame,cfg['cable'],failures)
        check_stack(frame,controller,bar,stack,cfg['machine'],failures)
    if planted_obj is not None:
        planted_obj.location=planted_old; bpy.context.view_layer.update()
    report={'status':'FAIL' if failures else 'PASS','frames':[scene.frame_start,scene.frame_end],'failure_count':len(failures),'failures':[f.__dict__ for f in failures[:500]],'tolerances':{'position_m':EPS_POS,'bone_length_m':EPS_LEN,'angle_deg':math.degrees(EPS_ANGLE),'driver_m':EPS_DRIVER,'pad_contact_m':[PAD_MIN,PAD_MAX]}}
    text=json.dumps(report,indent=2); print(text)
    if log_path: Path(log_path).write_text(text+'\n',encoding='utf-8')
    if failures: raise ValidationError(f'Lat pulldown validation failed: {len(failures)} failures')
    return report

def _arg(name,default=None):
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    if name in args:
        i=args.index(name); return args[i+1] if i+1<len(args) else True
    return default

if __name__=='__main__':
    try: validate_scene(_arg('--log'),planted_failure=bool(_arg('--plant-failure',False)))
    except Exception as exc:
        print(f'VALIDATOR_EXIT_NONZERO: {type(exc).__name__}: {exc}',file=sys.stderr); sys.exit(2)

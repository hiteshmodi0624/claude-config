import bpy, math, sys
from mathutils import Vector
from pathlib import Path

OUT = Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path('output/lat_pulldown.blend')
OUT.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.frame_start=1; scene.frame_end=96; scene.render.fps=24
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1280; scene.render.resolution_y=720; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.color=(0.018,0.022,0.03)

def mat(name,color,metallic=0.0,rough=.45):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value=(*color,1); b.inputs['Metallic'].default_value=metallic; b.inputs['Roughness'].default_value=rough
    return m

def cube(name,loc,scale,material,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(location=loc); o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        md=o.modifiers.new('Soft edges','BEVEL'); md.width=bevel; md.segments=3
    o.data.materials.append(material); return o

def sphere(name,loc,scale,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=loc); o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth=True
    return o

def cyl_between(name,a,b,radius,material,verts=32):
    a=Vector(a); b=Vector(b); v=b-a; L=v.length
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=L,location=(a+b)*.5)
    o=bpy.context.object; o.name=name; o.rotation_mode='QUATERNION'; o.rotation_quaternion=Vector((0,0,1)).rotation_difference(v.normalized()); o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth=True
    return o

def torus(name,loc,major,minor,rot,material):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=48,minor_segments=16,location=loc,rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth=True
    return o

def bone_parent(obj,rig,bone):
    mw=obj.matrix_world.copy(); obj.parent=rig; obj.parent_type='BONE'; obj.parent_bone=bone; obj.matrix_world=mw

def z_driver(obj,expression,controller):
    fc=obj.driver_add('location',2); d=fc.driver; d.type='SCRIPTED'; d.expression=expression
    v=d.variables.new(); v.name='p'; v.type='SINGLE_PROP'; v.targets[0].id=controller; v.targets[0].data_path='["pull"]'

def look_at(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

steel=mat('Graphite Steel',(0.055,0.065,0.08),.72,.26)
metal=mat('Brushed Metal',(0.22,0.25,0.29),.82,.24)
black=mat('Rubber',(0.018,0.02,0.024),0,.64)
padmat=mat('Pad',(0.06,0.07,0.09),0,.33)
skin=mat('Skin',(0.55,0.30,0.20),0,.50)
shirt=mat('Shirt',(0.035,0.10,0.16),0,.38)
shorts=mat('Shorts',(0.025,0.03,0.04),0,.52)
shoe=mat('Shoes',(0.72,0.72,0.70),0,.42)
accent=mat('Accent',(0.08,0.34,0.34),.15,.32)
floor_mat=mat('Floor',(0.09,0.10,0.115),0,.62)
wall_mat=mat('Wall',(0.055,0.06,0.07),0,.70)

cube('Floor',(0,0,0.02),(3.8,3.2,.02),floor_mat,.01)
cube('BackWall',(0,1.75,1.6),(3.8,.04,1.6),wall_mat,.02)

cube('BaseLeft',(-.88,.46,.08),(.10,.78,.08),steel,.035)
cube('BaseRight',(.88,.46,.08),(.10,.78,.08),steel,.035)
cube('CrossBase',(0,.90,.08),(.98,.10,.08),steel,.035)
cube('UprightLeft',(-.83,.92,1.48),(.085,.085,1.42),steel,.035)
cube('UprightRight',(.83,.92,1.48),(.085,.085,1.42),steel,.035)
cube('TopBeam',(0,.92,2.86),(.92,.09,.09),steel,.035)
cube('CenterTower',(0,1.00,1.52),(.18,.16,1.30),steel,.035)
cube('SeatMast',(0,.10,.55),(.11,.12,.48),metal,.025)
cube('Seat',(0,.02,.88),(.36,.38,.065),padmat,.07)
cube('ThighPad',(0,-.30,1.06),(.48,.12,.095),padmat,.075)
cube('PadSupport',(0,-.12,.83),(.055,.055,.28),metal,.02)
torus('Pulley',(0,.92,2.72),.135,.035,(math.radians(90),0,0),metal)
cyl_between('GuideL',(-.13,1.04,.30),(-.13,1.04,1.55),.012,metal,24)
cyl_between('GuideR',(.13,1.04,.30),(.13,1.04,1.55),.012,metal,24)

stack=bpy.data.objects.new('WeightStackMoving',None); bpy.context.collection.objects.link(stack)
for i in range(7):
    plate=cube(f'WeightPlate_{i:02d}',(0,1.03,.32+i*.055),(.30,.20,.021),metal,.015); plate.parent=stack
pin=cyl_between('SelectorPin',(-.34,.82,.55),(.02,1.01,.55),.012,accent,18); pin.parent=stack

bar=cyl_between('LatBar',(-.76,0,2.20),(.76,0,2.20),.022,metal,40)
bar['pull']=0.0
for f,p in [(1,0.0),(24,1.0),(48,0.0),(72,1.0),(96,0.0)]:
    bar['pull']=p; bar.keyframe_insert(data_path='["pull"]',frame=f)
bar['pull']=0.0
z_driver(bar,'2.20-0.48*p',bar)
for side,x in [('L',-.62),('R',.62)]:
    grip=cyl_between('Grip_'+side,(x-.10,0,2.20),(x+.10,0,2.20),.034,black,32); z_driver(grip,'2.20-0.48*p',bar)
z_driver(stack,'0.27*p',bar)

bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.007,depth=1.0,location=(0,0,2.46)); cable=bpy.context.object; cable.name='Cable'; cable.data.materials.append(black)
z_driver(cable,'(2.72+(2.20-0.48*p))/2',bar)
fc=cable.driver_add('scale',2); d=fc.driver; d.type='SCRIPTED'; d.expression='2.72-(2.20-0.48*p)'; v=d.variables.new(); v.name='p'; v.type='SINGLE_PROP'; v.targets[0].id=bar; v.targets[0].data_path='["pull"]'
cyl_between('CableTop',(0,.92,2.72),(0,0,2.72),.007,black,20)

arm_data=bpy.data.armatures.new('AthleteRigData'); rig=bpy.data.objects.new('AthleteRig',arm_data); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
E=arm_data.edit_bones
def eb(name,head,tail,parent=None,use_connect=False):
    b=E.new(name); b.head=head; b.tail=tail
    if parent: b.parent=E[parent]; b.use_connect=use_connect
    return b

eb('pelvis',(0,0,1.00),(0,0,1.13))
eb('spine',(0,0,1.13),(0,0,1.56),'pelvis',True)
eb('neck',(0,0,1.56),(0,0,1.70),'spine',True)
eb('head',(0,0,1.70),(0,0,1.92),'neck',True)
for side,s in [('L',-1),('R',1)]:
    shoulder=(s*.27,0,1.53); elbow=(s*.44,-.02,1.86); wrist=(s*.62,0,2.20)
    eb(f'upper_arm.{side}',shoulder,elbow,'spine',False)
    eb(f'forearm.{side}',elbow,wrist,f'upper_arm.{side}',True)
    eb(f'hand.{side}',wrist,(s*.70,0,2.20),f'forearm.{side}',True)
for side,s in [('L',-1),('R',1)]:
    hip=(s*.16,-.03,1.04); knee=(s*.16,-.48,.88); ankle=(s*.16,-.49,.27); toe=(s*.16,-.76,.14)
    eb(f'thigh.{side}',hip,knee,'pelvis',False)
    eb(f'shin.{side}',knee,ankle,f'thigh.{side}',True)
    eb(f'foot.{side}',ankle,toe,f'shin.{side}',True)
bpy.ops.object.mode_set(mode='POSE')
for side,s in [('L',-1),('R',1)]:
    target=bpy.data.objects.new(f'GripTarget.{side}',None); bpy.context.collection.objects.link(target); target.empty_display_type='SPHERE'; target.empty_display_size=.035
    target.location=(s*.62,0,2.20); z_driver(target,'2.20-0.48*p',bar)
    pb=rig.pose.bones[f'forearm.{side}']; con=pb.constraints.new('IK'); con.target=target; con.chain_count=2; con.use_tail=True; con.iterations=128
    rig.pose.bones[f'upper_arm.{side}'].ik_stretch=0.0; rig.pose.bones[f'forearm.{side}'].ik_stretch=0.0
sp=rig.pose.bones['spine']; sp.rotation_mode='XYZ'
for f,a in [(1,0),(24,math.radians(-5)),(48,0),(72,math.radians(-5)),(96,0)]:
    sp.rotation_euler.x=a; sp.keyframe_insert(data_path='rotation_euler',frame=f)
bpy.ops.object.mode_set(mode='OBJECT')

pel=sphere('PelvisMesh',(0,0,1.08),(.25,.17,.20),shorts); bone_parent(pel,rig,'pelvis')
torso=sphere('TorsoMesh',(0,0,1.38),(.34,.20,.38),shirt); bone_parent(torso,rig,'spine')
neck=sphere('NeckMesh',(0,0,1.61),(.085,.08,.11),skin); bone_parent(neck,rig,'neck')
head=sphere('HeadMesh',(0,-.015,1.80),(.13,.12,.16),skin); bone_parent(head,rig,'head')
hair=sphere('Hair',(0,.015,1.875),(.135,.125,.08),black); bone_parent(hair,rig,'head')
for side in ('L','R'):
    for bn,radius,material in [(f'upper_arm.{side}',.075,shirt),(f'forearm.{side}',.065,skin),(f'hand.{side}',.060,skin),(f'thigh.{side}',.095,shorts),(f'shin.{side}',.075,skin),(f'foot.{side}',.085,shoe)]:
        b=arm_data.bones[bn]; o=cyl_between(bn+'_mesh',rig.matrix_world@b.head_local,rig.matrix_world@b.tail_local,radius,material,32); bone_parent(o,rig,bn)
for side,s in [('L',-1),('R',1)]:
    sh=sphere(f'Shoulder.{side}',(s*.27,0,1.53),(.09,.09,.09),shirt); bone_parent(sh,rig,'upper_arm.'+side)
    palm=sphere(f'Palm.{side}',(s*.635,0,2.20),(.075,.050,.050),skin); bone_parent(palm,rig,'hand.'+side)
    knee=sphere(f'Knee.{side}',(s*.16,-.48,.88),(.085,.085,.085),skin); bone_parent(knee,rig,'shin.'+side)
for x in (-.16,.16): cube('FootPlatform'+str(x),(x,-.63,.10),(.15,.34,.025),black,.02)

def area(name,loc,energy,size,target):
    data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.shape='DISK'; data.size=size
    o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o); o.location=loc; look_at(o,target)
area('Key',(-3,-4,4.5),1000,3.0,(0,0,1.2)); area('Fill',(3,-2,3),700,2.5,(0,0,1.3)); area('Rim',(0,2.4,4),900,2.0,(0,0,1.5))
cam_data=bpy.data.cameras.new('Camera'); cam=bpy.data.objects.new('Camera',cam_data); bpy.context.collection.objects.link(cam)
cam.location=(3.25,-5.5,2.45); cam.data.lens=58; look_at(cam,(0,.15,1.4)); scene.camera=cam

for action in bpy.data.actions:
    for fc in action.fcurves:
        for kp in fc.keyframe_points: kp.interpolation='BEZIER'
scene['BUILD']='Self-contained Lat Pulldown Preview'
scene['BLENDER_TARGET']='4.5 LTS'
scene['ANIMATION']='96 frames @ 24fps, two controlled repetitions'
scene['CONTROLS']='LatBar["pull"] drives bar, cable and weight stack. Arm IK targets share the same pull driver.'

# Render visual checks and save with frame 1 active.
for f,name in [(1,'lat_pulldown_top.png'),(24,'lat_pulldown_bottom.png')]:
    scene.frame_set(f); scene.render.filepath=str((OUT.parent/name).resolve()); bpy.ops.render.render(write_still=True)
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT.resolve()))
print('SAVED',OUT.resolve())

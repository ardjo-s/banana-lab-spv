"""Inspect the five saved Blender projects with: blender -b -P verify_poses.py -- WORK."""

import math
import sys
from itertools import pairwise
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils.bvhtree import BVHTree
from mathutils.geometry import interpolate_bezier

arguments = sys.argv[sys.argv.index("--") + 1 :]
work = Path(arguments[0]).resolve()


def animated_prop(prefix):
    return next(
        obj
        for obj in bpy.context.scene.objects
        if obj.name.startswith(prefix)
        and obj.parent is None
        and obj.animation_data
        and obj.animation_data.action
    )


def gloves(actor):
    return [
        obj
        for obj in bpy.data.objects[actor].children_recursive
        if obj.name.startswith("Main gantée")
    ]


def hand_distance(actor, prop):
    return min(
        (g.matrix_world.translation - prop.matrix_world.translation).length
        for g in gloves(actor)
    )


def hand_pads(actor, side):
    hand = sorted(gloves(actor), key=lambda g: g.name)[side]
    pads = [
        child for child in hand.children if child.name.startswith("Contact du doigt")
    ]
    assert len(pads) == 3
    return pads


def peel_clearance(bunch):
    vertices, faces = [], []
    for fruit in bunch.children:
        offset = len(vertices)
        vertices.extend(fruit.matrix_basis @ v.co for v in fruit.data.vertices)
        faces.extend(tuple(offset + i for i in f.vertices) for f in fruit.data.polygons)
    peel = BVHTree.FromPolygons(vertices, faces)

    def gaps(pads):
        inverse = bunch.matrix_world.inverted()
        result = []
        for pad in pads:
            centre = inverse @ pad.matrix_world.translation
            point, normal, _, _ = peel.find_nearest(centre)
            result.append((centre - point).dot(normal))
        return result

    return gaps


def grasp(values):
    # The locator is at the centre of each rounded pad, outside and within
    # approximately one pad radius of the actual peel.
    assert all(0.008 < gap < 0.043 for gap in values), values


def check_transfer(scene, bunch, gaps):
    assert scene.frame_end == 182
    assert {m.frame for m in scene.timeline_markers if m.camera} == {1, 45, 83, 145}
    giver = hand_pads("Kevin", 1)
    receiver = hand_pads("Bob", 0)
    scene.frame_set(1)
    start = bunch.location.copy()
    open_pads = [pad.location.copy() for pad in giver]
    scene.frame_set(18)
    assert (bunch.location - start).length < 0.001 and max(gaps(giver)) < 0.04
    assert min(gaps(receiver)) > 0.40
    assert all(
        (pad.location - open_pad).length > 0.11
        for pad, open_pad in zip(giver, open_pads)
    )
    eye = next(
        o
        for o in bpy.data.objects["Bob"].children_recursive
        if o.name.startswith("Regard")
    )
    scene.frame_set(29)
    waiting_gaze = eye.location.z
    scene.frame_set(35)
    assert waiting_gaze - eye.location.z > 0.055 and min(gaps(receiver)) > 0.45
    scene.frame_set(62)
    grasp(gaps(giver + receiver))
    scene.frame_set(69)
    first_hold = [pad.location.copy() for pad in receiver]
    z = bunch.location.z
    torso = bpy.data.objects["Bob · bassin"]
    hips = torso.location.z
    # The insert must show the loaded fingers changing purchase, not just the
    # arm following the falling fruit. Measure in the glove's own coordinates.
    for frame in (69, 72, 76, 81):
        scene.frame_set(frame)
        assert scene.camera.name.startswith("Contrechamp")
        grasp(gaps(receiver))
    scene.frame_set(76)
    assert (receiver[0].location - first_hold[0]).length > 0.035
    assert (receiver[1].location - first_hold[1]).length > 0.035
    assert z - bunch.location.z > 0.14 and hips - torso.location.z > 0.21
    assert min(gaps(giver)) > 0.08 and max(gaps(receiver)) < 0.042
    assert (
        next(
            o
            for o in bpy.data.objects["Bob"].children_recursive
            if o.name.startswith("Bouche articulée")
        )
        .data.shape_keys.key_blocks["Surprise"]
        .value
        > 0.7
    )
    scene.frame_set(86)
    assert bunch.location.z > z - 0.11 and max(gaps(receiver)) < 0.042
    level = bunch.location.copy()
    gaze_down = eye.location.z
    kevin_eye = next(
        o
        for o in bpy.data.objects["Kevin"].children_recursive
        if o.name.startswith("Regard")
    )
    pivot = bpy.data.objects["Bob · signe de tête"]
    for frame in (91, 99, 108, 114, 122, 133, 138):
        scene.frame_set(frame)
        assert scene.camera.name.startswith("Caméra · les deux visages")
        assert (bunch.location - level).length < 0.002
        grasp(gaps(receiver))
        assert kevin_eye.location.x > 0.055
        if frame < 101:
            assert abs(eye.location.z - gaze_down) < 0.006
        else:
            assert eye.location.z - gaze_down > 0.06 and eye.location.x < -0.05
        if frame == 122:
            assert 0.18 < pivot.rotation_euler.x < 0.20
        else:
            assert abs(pivot.rotation_euler.x) < 0.001
        for actor in ("Bob", "Kevin"):
            for gaze in bpy.data.objects[actor].children_recursive:
                if gaze.name.startswith("Regard"):
                    pos = world_to_camera_view(
                        scene, scene.camera, gaze.matrix_world.translation
                    )
                    assert 0.07 < pos.x < 0.93 and 0.12 < pos.y < 0.88
    scene.frame_set(164)
    assert bunch.location.z < level.z - 0.30


def check_arms(scene):
    dimensions = {
        "Bob": (0.58, 1.82),
        "Kevin": (0.57, 2.49),
        "Stuart": (0.59, 2.06),
        "Client": (0.56, 2.13),
    }
    arms = [obj for obj in scene.objects if obj.name.startswith("Bras articulé")]
    assert arms
    for frame in range(1, scene.frame_end + 1):
        scene.frame_set(frame)
        for arm in arms:
            body = arm.parent
            radius, height = dimensions[body.parent.name]
            points = arm.data.splines[0].bezier_points
            wrist = arm.matrix_world @ points[-1].co
            cuffs = [
                o for o in body.children_recursive if o.name.startswith("Manchette")
            ]
            assert (
                min((wrist - c.matrix_world.translation).length for c in cuffs) < 0.006
            )
            for left, right in pairwise(points[3:10]):
                for pos in interpolate_bezier(
                    left.co, left.handle_right, right.handle_left, right.co, 4
                ):
                    dz = max(0, 0.28 + radius - pos.z, pos.z - (height - radius))
                    skin = math.sqrt(max(0, radius**2 - dz**2))
                    assert math.hypot(pos.x, pos.y / 0.89) - skin > 0.074, (
                        frame,
                        arm.name,
                    )


for name in arguments[1:] or ("cover", "depart", "achat", "marche", "vente"):
    bpy.ops.wm.open_mainfile(filepath=str(work / (name + ".blend")))
    scene = bpy.context.scene
    check_arms(scene)
    assert scene.render.engine == "CYCLES" and scene.render.fps == 24
    assert all(image.packed_file for image in bpy.data.images if image.source == "FILE")
    if name == "achat":
        prop = animated_prop("Caisse à claire-voie")
        scene.frame_set(1)
        start = prop.matrix_world.translation.copy()
        for frame in (15, 39, 60, 76):
            scene.frame_set(frame)
            for glove in gloves("Stuart"):
                local = prop.matrix_world.inverted() @ glove.matrix_world.translation
                assert (
                    0.47 < abs(local.x) < 0.64
                    and abs(local.y) < 0.12
                    and 0.16 < local.z < 0.36
                ), (name, frame, local)
        assert prop.matrix_world.translation.x - start.x > 2
    else:
        prop = animated_prop("Régime · poignée")
        gaps = peel_clearance(prop)
        if name == "cover":
            check_transfer(scene, prop, gaps)
        elif name == "depart":
            scene.frame_set(38)
            grasp(gaps(hand_pads("Kevin", 0) + hand_pads("Kevin", 1)))
            scene.frame_set(76)
            bins = [
                o
                for o in scene.objects
                if o.name.startswith("Caisse à claire-voie") and not o.parent
            ]
            receiver = max(bins, key=lambda o: o.location.x)
            local = receiver.matrix_world.inverted() @ prop.matrix_world.translation
            assert (
                abs(local.x) < 0.18 and abs(local.y) < 0.23 and 0.08 < local.z < 0.45
            ), local
        elif name == "marche":
            scene.frame_set(38)
            grasp(gaps(hand_pads("Bob", 0) + hand_pads("Bob", 1)))
            scene.frame_set(76)
            assert abs(prop.matrix_world.translation.z - 0.94) < 0.03
        else:
            scene.frame_set(37)
            grasp(gaps(hand_pads("Bob", 1) + hand_pads("Client", 0)))
            money = animated_prop("Pièce payée")
            scene.frame_set(1)
            start = money.matrix_world.translation.copy()
            assert hand_distance("Client", money) < 0.12
            scene.frame_set(76)
            assert (
                hand_distance("Bob", money) < 0.12
                and money.matrix_world.translation.x < start.x - 1
            )
    print("POSE_OK", name, flush=True)

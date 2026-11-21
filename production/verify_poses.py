"""Inspect the five saved Blender projects with: blender -b -P verify_poses.py -- WORK."""

import sys
from pathlib import Path

import bpy

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


for name in arguments[1:] or ("cover", "depart", "achat", "marche", "vente"):
    bpy.ops.wm.open_mainfile(filepath=str(work / (name + ".blend")))
    scene = bpy.context.scene
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
        if name == "cover":
            assert {m.frame for m in scene.timeline_markers if m.camera} == {1, 37, 63}
            scene.frame_set(52)
            assert (
                hand_distance("Bob", prop) < 0.37
                and hand_distance("Kevin", prop) < 0.38
            )
        elif name == "depart":
            scene.frame_set(38)
            assert hand_distance("Kevin", prop) < 0.38
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
            assert hand_distance("Bob", prop) < 0.38
            scene.frame_set(76)
            assert abs(prop.matrix_world.translation.z - 0.94) < 0.03
        else:
            scene.frame_set(37)
            assert max(hand_distance("Bob", prop), hand_distance("Client", prop)) < 0.33
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

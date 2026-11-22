"""Original Blender character assets and the five animated takes for La tournée des bananes.

Blender 4.5 LTS: blender -b -P production/film.py -- cover /tmp/banana-film
Use --still for a look-dev frame, or --save to keep the editable animated .blend.
For all deliverables run: python3 production/render.py /path/to/frames
The look-development reference was EL4CTEO/blender-skills (lighting-lookdev and rendering).
Character geometry, materials, animation and staging are authored here.
"""

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

CLI = argparse.ArgumentParser()
CLI.add_argument("shot", choices=["cover", "depart", "achat", "marche", "vente"])
CLI.add_argument("out", type=Path)
CLI.add_argument("--still", type=int)
CLI.add_argument("--save", action="store_true")
CLI.add_argument("--scale", type=int, default=100)
CLI.add_argument("--samples", type=int, default=10)
CLI.add_argument("--start", type=int, default=1)
CLI.add_argument("--end", type=int)
args = CLI.parse_args(sys.argv[sys.argv.index("--") + 1 :])
args.out = args.out.resolve()
pi, sin, cos = math.pi, math.sin, math.cos
V = Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.samples = args.samples
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 5
sc.cycles.diffuse_bounces = 2
sc.cycles.glossy_bounces = 3
sc.cycles.sample_clamp_indirect = 3
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "METAL"
    prefs.refresh_devices()
    for device in prefs.devices:
        device.use = device.type == "METAL"
    if any(d.use for d in prefs.devices):
        sc.cycles.device = "GPU"
except TypeError:
    pass
sc.render.use_persistent_data = True
sc.render.resolution_x, sc.render.resolution_y = 1152, 704
sc.render.resolution_percentage = args.scale
sc.render.fps = 24
sc.render.use_motion_blur = True
sc.render.motion_blur_shutter = 0.32
sc.frame_end = 182 if args.shot == "cover" else 76
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
sc.world = bpy.data.worlds.new("Lumière ambiante du plateau")
sc.world.use_nodes = True
sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.52, 0.63, 0.78, 1)
sc.world.node_tree.nodes["Background"].inputs[1].default_value = 0.24


def material(name, rgb, rough=0.5, metal=0, grain=0, bump=0, texture_color=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    sh = nt.nodes.get("Principled BSDF")
    sh.inputs["Base Color"].default_value = (*rgb, 1)
    sh.inputs["Roughness"].default_value = rough
    sh.inputs["Metallic"].default_value = metal
    if grain:
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = grain
        tex.inputs["Detail"].default_value = 2.5
        if texture_color:
            ramp = nt.nodes.new("ShaderNodeValToRGB")
            for e, position, tint in zip(
                ramp.color_ramp.elements, [0.25, 0.79], [texture_color, rgb]
            ):
                e.position, e.color = position, (*tint, 1)
            nt.links.new(tex.outputs["Fac"], ramp.inputs[0])
            nt.links.new(ramp.outputs[0], sh.inputs["Base Color"])
        if bump:
            n = nt.nodes.new("ShaderNodeBump")
            n.inputs["Strength"].default_value = 0.22
            n.inputs["Distance"].default_value = bump
            nt.links.new(tex.outputs["Fac"], n.inputs["Height"])
            nt.links.new(n.outputs[0], sh.inputs["Normal"])
    return m


def principled(m):
    return m.node_tree.nodes["Principled BSDF"].inputs


skin = material(
    "Épiderme · miel et citron",
    (0.99, 0.53, 0.012),
    0.43,
    grain=175,
    bump=0.003,
    texture_color=(0.90, 0.44, 0.007),
)
principled(skin)["Subsurface Weight"].default_value = 0.095
principled(skin)["Subsurface Radius"].default_value = (0.11, 0.055, 0.025)
denim = material(
    "Indigo · sergé délavé",
    (0.074, 0.18, 0.31),
    0.82,
    grain=105,
    bump=0.008,
    texture_color=(0.027, 0.076, 0.15),
)
principled(denim)["Sheen Weight"].default_value = 0.32
# Diagonal twill crossing the finer thread noise.
nt = denim.node_tree
tc = nt.nodes.new("ShaderNodeTexCoord")
wave = nt.nodes.new("ShaderNodeTexWave")
wave.bands_direction = "DIAGONAL"
wave.inputs["Scale"].default_value = 210
wave.inputs["Distortion"].default_value = 1.3
nt.links.new(tc.outputs["Object"], wave.inputs[0])
weave = nt.nodes.new("ShaderNodeBump")
weave.inputs["Strength"].default_value = 0.16
weave.inputs["Distance"].default_value = 0.0018
nt.links.new(wave.outputs["Fac"], weave.inputs["Height"])
nt.links.new(principled(denim)["Normal"].links[0].from_socket, weave.inputs["Normal"])
nt.links.new(weave.outputs[0], principled(denim)["Normal"])
thread = material("Surpiqûre · tabac", (0.57, 0.33, 0.12), 0.8)
rubber = material(
    "Gants de cuir noir", (0.025, 0.020, 0.016), 0.43, grain=80, bump=0.006
)
strap = material(
    "Élastique graphite", (0.03, 0.026, 0.021), 0.72, grain=140, bump=0.005
)
steel = material(
    "Aluminium satiné", (0.59, 0.63, 0.65), 0.30, 0.87, grain=220, bump=0.0004
)
rim = material("Bague en acier brossé", (0.34, 0.39, 0.41), 0.33, 0.86)
bronze = material("Boutons en laiton", (0.52, 0.33, 0.14), 0.3, 0.77)
white = material("Ivoire humide", (0.95, 0.925, 0.80), 0.24)
pupil = material("Pupille", (0.009, 0.005, 0.003), 0.13)
mouth = material("Intérieur de bouche", (0.094, 0.018, 0.009), 0.47)
tongue = material("Langue", (0.47, 0.10, 0.071), 0.46)
hair = material("Mèches", (0.035, 0.018, 0.009), 0.48)
glint = material("Éclat des yeux", (0.99, 0.98, 0.91), 0.11)
principled(glint)["Emission Color"].default_value = (1, 0.98, 0.91, 1)
principled(glint)["Emission Strength"].default_value = 0.7
wood = material(
    "Cèdre huilé",
    (0.46, 0.21, 0.078),
    0.55,
    grain=5,
    bump=0.028,
    texture_color=(0.20, 0.063, 0.021),
)
pale = material(
    "Peuplier brut",
    (0.60, 0.35, 0.15),
    0.69,
    grain=7,
    bump=0.016,
    texture_color=(0.38, 0.18, 0.064),
)
for m in (wood, pale):
    nt = m.node_tree
    mapping = nt.nodes.new("ShaderNodeVectorMath")
    mapping.operation = "MULTIPLY"
    mapping.inputs[1].default_value = (1.4, 5, 19)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(coord.outputs["Generated"], mapping.inputs[0])
    nt.links.new(mapping.outputs[0], nt.nodes.get("Noise Texture").inputs["Vector"])
teal = material(
    "Émail bleu pétrole",
    (0.043, 0.18, 0.17),
    0.44,
    0.15,
    9,
    0.018,
    (0.017, 0.10, 0.095),
)
cream = material("Toile écrue", (0.84, 0.68, 0.42), 0.75, grain=68, bump=0.009)
red = material(
    "Toile rouge coquelicot", (0.56, 0.067, 0.037), 0.73, grain=70, bump=0.008
)
peel = material(
    "Peau de banane tachetée", (0.95, 0.65, 0.014), 0.41, grain=67, bump=0.002
)
nt = peel.node_tree
speck = nt.nodes.new("ShaderNodeValToRGB")
for e, v, c in zip(
    speck.color_ramp.elements,
    [0.29, 0.38],
    [(0.22, 0.086, 0.008, 1), (0.98, 0.66, 0.017, 1)],
):
    e.position, e.color = v, c
nt.links.new(nt.nodes["Noise Texture"].outputs["Fac"], speck.inputs[0])
nt.links.new(speck.outputs[0], principled(peel)["Base Color"])
stem = material("Tige mûre", (0.20, 0.18, 0.038), 0.7)
plaster = material(
    "Enduit de chaux",
    (0.50, 0.36, 0.22),
    0.86,
    grain=9,
    bump=0.025,
    texture_color=(0.32, 0.21, 0.14),
)
coinmat = material("Jeton doré", (0.98, 0.50, 0.058), 0.23, 0.78)


def linked(name, data=None, parent=None):
    o = bpy.data.objects.new(name, data)
    sc.collection.objects.link(o)
    o.parent = parent
    return o


def finish(o, name, mat, parent, smooth=True):
    o.name = name
    o.parent = parent
    o.data.materials.append(mat)
    if smooth and o.type == "MESH":
        for f in o.data.polygons:
            f.use_smooth = True
    return o


def mesh(name, verts, faces, mat, parent=None, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    return finish(linked(name, data), name, mat, parent, smooth)


def sphere(name, loc, scale, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=36, ring_count=24)
    o = finish(bpy.context.object, name, mat, parent)
    o.location = loc
    o.scale = scale
    return o


def box(name, loc, dim, mat, parent=None, bevel=0.024):
    x, y, z = [i * 0.5 for i in dim]
    pts = [
        (-x, -y, -z),
        (x, -y, -z),
        (x, y, -z),
        (-x, y, -z),
        (-x, -y, z),
        (x, -y, z),
        (x, y, z),
        (-x, y, z),
    ]
    o = mesh(
        name,
        pts,
        [
            (0, 3, 2, 1),
            (4, 5, 6, 7),
            (0, 1, 5, 4),
            (1, 2, 6, 5),
            (2, 3, 7, 6),
            (3, 0, 4, 7),
        ],
        mat,
        parent,
        False,
    )
    o.location = loc
    if bevel:
        b = o.modifiers.new("Arêtes usées", "BEVEL")
        b.width = bevel
        b.segments = 3
        o.modifiers.new("Normales de surface", "WEIGHTED_NORMAL")
    return o


def tube(name, pts, r, mat, parent=None):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.resolution_u = 9
    cu.bevel_depth = r
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for p, v in zip(sp.bezier_points, pts):
        p.co = v
        p.handle_left_type = p.handle_right_type = "AUTO"
    o = linked(name, cu, parent)
    cu.materials.append(mat)
    return o


def torus(name, loc, major, minor, mat, parent):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=64, minor_segments=16, major_radius=major, minor_radius=minor
    )
    o = finish(bpy.context.object, name, mat, parent)
    o.location = loc
    o.rotation_euler.x = pi / 2
    return o


def shell(name, profile, mat, parent, ystretch=0.89, arc=pi, segments=72):
    verts = []
    faces = []
    for z, r in profile:
        for j in range(segments + 1):
            a = -arc + 2 * arc * j / segments
            verts.append((r * sin(a), -r * cos(a) * ystretch, z))
    for i in range(len(profile) - 1):
        for j in range(segments):
            a = i * (segments + 1) + j
            faces.append((a, a + 1, a + segments + 2, a + segments + 1))
    return mesh(name, verts, faces, mat, parent)


def fruit(parent, loc=(0, 0, 0), scale=1):
    group = linked("Régime · poignée", parent=parent)
    group.location = loc
    group.scale = (scale,) * 3
    for i in range(4):
        verts = []
        faces = []
        n = 26
        sides = 12
        for j in range(n + 1):
            t = j / n
            cx = -0.43 + 0.84 * t
            z = 0.29 * (2 * t - 1) ** 2 + 0.03 * t
            radius = (0.022 + 0.081 * sin(pi * t) ** 0.64) * (1 - 0.16 * t)
            for k in range(sides):
                a = 2 * pi * k / sides
                verts.append(
                    (
                        cx - radius * sin(a) * (0.54 * (2 * t - 1)),
                        radius * cos(a),
                        z + radius * sin(a),
                    )
                )
        for j in range(n):
            for k in range(sides):
                a = j * sides + k
                b = j * sides + (k + 1) % sides
                faces.append((a, b, b + sides, a + sides))
        faces += [
            tuple(reversed(range(sides))),
            tuple(range(n * sides, (n + 1) * sides)),
        ]
        f = mesh("Banane", verts, faces, peel, group)
        f.location = (0, (i - 1.5) * 0.097, 0.026 * (i % 2))
        f.rotation_euler = (0.055 * i, 0.075 * (i - 1), 0.095 * (i - 1.5))
        tube(
            "Pédoncule",
            [(0.397, 0, 0.29), (0.416, 0, 0.35), (0.416, 0.013, 0.39)],
            0.028,
            stem,
            f,
        )
        sphere("Pointe", (-0.43, 0, 0.291), (0.025, 0.023, 0.022), stem, f)
    return group


def crate(parent, loc, full=False):
    g = linked("Caisse à claire-voie", parent=parent)
    g.location = loc
    for x in [-0.58, 0.58]:
        for y in [-0.28, 0.28]:
            box("Montant", (x, y, 0.235), (0.064, 0.062, 0.45), wood, g, 0.009)
    for z in [0.095, 0.245, 0.39]:
        for y in [-0.30, 0.30]:
            box("Latte", (0, y, z), (1.22, 0.047, 0.12), pale, g, 0.009)
        for x in [-0.59, 0.59]:
            box("Latte de bout", (x, 0, z), (0.052, 0.61, 0.12), wood, g, 0.008)
    box("Fond", (0, 0, 0.04), (1.2, 0.6, 0.07), pale, g, 0.008)
    for x in [-0.55, 0.55]:
        for z in [0.105, 0.395]:
            sphere("Tête de clou", (x, -0.328, z), (0.014, 0.006, 0.014), rim, g)
    if full:
        fruit(g, (0, 0, 0.37), 1)
    return g


def key(o, prop, frame):
    o.keyframe_insert(data_path=prop, frame=frame)


def orient(o, target):
    o.rotation_euler = (V(target) - o.location).to_track_quat("-Z", "Y").to_euler()


def ease(t):
    t = min(1, max(0, t))
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return V(a).lerp(V(b), t)


def iris_material(name, light, dark):
    m = material(name, light, 0.22)
    nt = m.node_tree
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], sep.inputs[0])

    def mathnode(op, a, b):
        n = nt.nodes.new("ShaderNodeMath")
        n.operation = op
        for inp, val in zip(n.inputs, (a, b)):
            if isinstance(val, (int, float)):
                inp.default_value = val
            else:
                nt.links.new(val, inp)
        return n.outputs[0]

    polar = mathnode("ARCTAN2", sep.outputs["Z"], sep.outputs["X"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 17
    nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
    stripe = mathnode(
        "SINE",
        mathnode(
            "ADD",
            mathnode("MULTIPLY", polar, 97),
            mathnode("MULTIPLY", noise.outputs[0], 8),
        ),
        0,
    )
    val = mathnode("ADD", mathnode("MULTIPLY", stripe, 0.45), 0.5)
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    for e, col in zip(ramp.color_ramp.elements, [dark, light]):
        e.color = (*col, 1)
    nt.links.new(val, ramp.inputs[0])
    nt.links.new(ramp.outputs[0], principled(m)["Base Color"])
    return m


amber = iris_material(
    "Fibres de l’iris · ambre", (0.50, 0.25, 0.064), (0.11, 0.046, 0.012)
)
hazel = iris_material(
    "Fibres de l’iris · noisette", (0.28, 0.33, 0.10), (0.08, 0.085, 0.026)
)


class PeelContact:
    """Collision surface shared by the four hands in the transfer close-up."""

    def __init__(self, bunch):
        self.bunch = bunch
        verts = []
        faces = []
        for fruit_mesh in bunch.children:
            if fruit_mesh.type != "MESH":
                continue
            base = len(verts)
            verts.extend(
                fruit_mesh.matrix_basis @ v.co for v in fruit_mesh.data.vertices
            )
            faces.extend(
                tuple(base + i for i in f.vertices) for f in fruit_mesh.data.polygons
            )
        self.skin = BVHTree.FromPolygons(verts, faces)

    def wrap(self, points, hand_space, back, pad, amount, thumb):
        if amount <= 0:
            return
        to_bunch = self.bunch.matrix_basis.inverted() @ hand_space
        to_hand = to_bunch.inverted()
        normal = V((0, 0, -1)) if thumb else V((0, 1 if back else -1, 0))
        for i in range(1, len(points)):
            pt = to_bunch @ points[i]
            hit, _, _, _ = self.skin.ray_cast(pt + normal, -normal, 1.35)
            if hit is None:
                continue
            clearance = (pt - hit).dot(normal)
            # Keep open or distant hands independent of the fruit.
            if -0.26 < clearance < 0.045:
                pt += normal * (pad - clearance) * amount
                points[i] = to_hand @ pt


glove_leather = rubber.copy()
glove_leather.name = "Cuir souple des gants"
principled(glove_leather)["Roughness"].default_value = 0.59
principled(glove_leather)["Specular IOR Level"].default_value = 0.34


class Glove:
    """Three padded fingers wrapping from below, with an opposed thumb."""

    def __init__(self, parent, side):
        self.root = linked("Main gantée", parent=parent)
        self.side = side
        sphere(
            "Manchette",
            (0, 0.064, -0.014),
            (0.098, 0.067, 0.071),
            glove_leather,
            self.root,
        )
        self.palm = sphere(
            "Paume", (0, 0, -0.003), (0.115, 0.100, 0.066), glove_leather, self.root
        )
        self.digits = []
        for digit in range(3):
            curve = tube(
                ("Index", "Majeur", "Pouce")[digit],
                [(0, 0, 0)] * 6,
                (0.039, 0.041, 0.044)[digit],
                glove_leather,
                self.root,
            )
            tip = linked("Contact du doigt", parent=self.root)
            for bp, radius in zip(
                curve.data.splines[0].bezier_points,
                [1.16, 1.07, 0.97, 0.83, 0.60, 0.09],
            ):
                bp.radius = radius
            self.digits.append((curve, tip))

    def pose(self, frame, squeeze, pressure, hand_space, surface, back):
        for digit, (curve, tip) in enumerate(self.digits):
            # The index lands first and the opposed thumb locks a little later.
            curl = ease(
                (squeeze - (0.00, 0.07, 0.14)[digit]) / (1 - (0.00, 0.07, 0.14)[digit])
            )
            if digit < 2:
                side = (-1, 1)[digit] * self.side
                origin = V((side * 0.048, -0.036, 0.004))
                axis = V(
                    (side * (0.33 - 0.12 * curl) - self.side * 0.24 * curl, -1, 0)
                ).normalized()
                angle = 0.01 + curl * 0.91
                lengths = (0.077, 0.066, 0.044)
                angles = (angle, angle + 0.16 + 1.00 * curl, angle + 0.32 + 2.12 * curl)
            else:
                origin = V((-self.side * 0.083, 0.030, 0.006))
                axis = V((-self.side * 0.67, 0.74, 0))
                angle = 0.27 + 0.70 * curl
                lengths = (0.066, 0.052, 0.038)
                angles = (angle, angle + 0.27 + 1.02 * curl, angle + 0.40 + 1.48 * curl)
            pts = [origin]
            for length, ang in zip(lengths, angles):
                pts.append(pts[-1] + length * (axis * cos(ang) + V((0, 0, sin(ang)))))
            if surface:
                surface.wrap(
                    pts,
                    hand_space,
                    back,
                    0.030 if digit != 2 else 0.035,
                    ease((squeeze - 0.05) / 0.73),
                    digit == 2,
                )
            # A rounded, tapering cap continues the last joint without a separate ball.
            distal = (pts[-1] - pts[-2]).normalized()
            pad = pts[-1].copy()
            pts.extend([pad + distal * 0.014, pad + distal * 0.027])
            for bp, pos in zip(curve.data.splines[0].bezier_points, pts):
                bp.co = pos
                bp.keyframe_insert(data_path="co", frame=frame)
            tip.location = pad
            key(tip, "location", frame)
        self.palm.scale.z = 0.066 - 0.009 * pressure
        key(self.palm, "scale", frame)


def make_mouth(body, radius_at, height):
    # The lip, enamel and tongue all deform in the same mouth coordinates.
    # This keeps the teeth inside the opening when the mouth becomes a tight slit.
    coords = []
    faces = []
    materials = []

    def patch(us, vs, mat, depth, rounded=False):
        for j, v in enumerate(vs):
            for i, u in enumerate(us):
                x = u
                if rounded:
                    x += (
                        (0.008 if i == 0 else -0.008 if i == len(us) - 1 else 0) * v * v
                    )
                coords.append((x, v, depth, mat))
                if i and j:
                    n = len(coords) - 1
                    faces.append((n - len(us) - 1, n - len(us), n, n - 1))
                    materials.append(mat)

    grid = [i / 20 - 1 for i in range(41)]
    patch(grid, [i / 8 for i in range(9)], 0, 0.014)
    for tooth in range(5):
        left = -0.65 + tooth * 0.26
        patch(
            [left, left + 0.028, left + 0.212, left + 0.246],
            [0.011, 0.09, 0.245],
            1,
            0.020,
            True,
        )
    patch([i * 0.065 - 0.52 for i in range(17)], [0.80, 0.88, 0.98], 2, 0.019)
    patch(grid, [1, 1.05, 1.105], 3, 0.012)

    def positions(shape):
        points = []
        width, corner, skew, opening = {
            "repos": (0.175, 0.019, 0.012, 0.058),
            "Effort": (0.205, -0.018, 0.037, 0.039),
            "Surprise": (0.109, -0.006, -0.003, 0.154),
            "Soulagement": (0.205, 0.045, -0.009, 0.086),
        }[shape]
        for u, v, depth, mat in coords:
            x = width * u
            arc = max(0, 1 - u * u)
            if mat == 1 and shape == "Surprise":
                v *= 0.31
            top = height + corner * u * u + skew * u + 0.009 * arc
            z = top - opening * arc**0.66 * v
            y = -0.89 * math.sqrt(max(0.03, radius_at(z) ** 2 - x * x))
            points.append((x, y - depth - 0.003 * sin(pi * min(1, v)), z))
        return points

    face = mesh("Bouche articulée", positions("repos"), faces, mouth, body)
    for m in (white, tongue, skin):
        face.data.materials.append(m)
    for polygon, mat in zip(face.data.polygons, materials):
        polygon.material_index = mat
    face.shape_key_add(name="Repos")
    keys = []
    for name in ("Effort", "Surprise", "Soulagement"):
        shape = face.shape_key_add(name=name)
        for v, co in zip(shape.data, positions(name)):
            v.co = co
        keys.append(shape)
    return keys


class Actor:
    def __init__(self, name):
        self.name = name
        height, radius, eyes = {
            "Kevin": (2.49, 0.57, 2),
            "Stuart": (2.06, 0.59, 1),
            "Bob": (1.82, 0.58, 2),
            "Client": (2.13, 0.56, 1),
        }[name]
        self.root = linked(name)
        self.body = linked(name + " · bassin", parent=self.root)
        body = self.body
        self.r = radius
        bottom = 0.28
        top = height
        eye_z = top - radius * 0.94
        self.shoulder = eye_z - 0.49

        def radius_at(z):
            if z < bottom + radius:
                return radius * math.sqrt(
                    max(0.0001, 1 - ((z - bottom - radius) / radius) ** 2)
                )
            if z > top - radius:
                return radius * math.sqrt(
                    max(0.0001, 1 - ((z - top + radius) / radius) ** 2)
                )
            return radius

        def surface(a, z, lift=0.012):
            r = radius_at(z) + lift
            return (r * sin(a), -r * 0.89 * cos(a), z)

        levels = [bottom + (top - bottom) * i / 64 for i in range(65)]
        head = shell("Corps · " + name, [(z, radius_at(z)) for z in levels], skin, body)
        head.shape_key_add(name="Repos")
        self.cheek = head.shape_key_add(name="Pommettes")
        for v in self.cheek.data:
            x, y, z = v.co
            if y < 0:
                bulge = math.exp(
                    -(((abs(x) - 0.27) / 0.14) ** 2) - ((z - eye_z + 0.30) / 0.131) ** 2
                )
                v.co.y -= 0.035 * bulge
                v.co.z += 0.018 * bulge
        bibtop = min(
            bottom + radius + 0.4, eye_z - (0.47 if eyes == 1 else 0.38) - 0.18
        )
        waist = min(bottom + radius + 0.08, bibtop - 0.22)
        shell(
            "Salopette · culotte",
            [(z, radius_at(z) + 0.016) for z in levels if z < waist]
            + [(waist, radius_at(waist) + 0.015)],
            denim,
            body,
        )
        # Front bib and narrow straps hug the body rather than cutting through the shoulders.
        verts = []
        faces = []
        for i in range(13):
            u = i / 12
            arc = 0.88 - 0.16 * u
            for j in range(31):
                a = arc * (j / 15 - 1)
                z = (
                    waist
                    - 0.04
                    + u * (bibtop - waist + 0.04)
                    - 0.025 * u * (j / 15 - 1) ** 4
                )
                verts.append(surface(a, z, 0.024))
        for i in range(12):
            for j in range(30):
                a = i * 31 + j
                faces.append((a, a + 1, a + 32, a + 31))
        mesh("Plastron en denim", verts, faces, denim, body)
        tube(
            "Ourlet supérieur",
            [surface(a, bibtop - 0.014, 0.030) for a in [-0.69, -0.42, 0, 0.42, 0.69]],
            0.006,
            thread,
            body,
        )
        for side in [-1, 1]:
            pts = []
            faces = []
            for i in range(33):
                t = i / 32
                a = side * (0.64 + 2.03 * t)
                z = bibtop - 0.04 + 0.21 * sin(pi * t) - 0.23 * t
                pts.extend([surface(a, z - 0.043, 0.030), surface(a, z + 0.052, 0.030)])
                if i:
                    faces.append((2 * i - 2, 2 * i, 2 * i + 1, 2 * i - 1))
            mesh("Bretelle", pts, faces, denim, body)
            loc = surface(0.64 * side, bibtop - 0.019, 0.049)
            sphere("Rivet gravé", loc, (0.050, 0.023, 0.050), bronze, body)
            for dx in [-0.011, 0.011]:
                sphere(
                    "Trou du bouton",
                    (loc[0] + dx, loc[1] - 0.021, loc[2]),
                    (0.006, 0.004, 0.007),
                    mouth,
                    body,
                )
        pv = []
        pf = []
        for k in range(8):
            t = k / 7
            for j in range(15):
                u = j / 7 - 1
                pv.append(
                    surface(
                        0.28 * u, waist + 0.18 - t * (0.13 + 0.055 * (1 - u * u)), 0.046
                    )
                )
                if k and j:
                    n = k * 15 + j
                    pf.append((n - 16, n - 15, n, n - 1))
        mesh("Poche plaquée", pv, pf, denim, body)
        for j in range(11):
            a = -0.25 + j * 0.048
            tube(
                "Point sellier",
                [
                    surface(a, waist + 0.16, 0.049),
                    surface(a + 0.028, waist + 0.16, 0.049),
                ],
                0.0031,
                thread,
                body,
            )
        badge_loc = surface(0, waist + 0.089, 0.056)
        badge = box(
            "Écusson de travail", badge_loc, (0.098, 0.010, 0.098), strap, body, 0.012
        )
        badge.rotation_euler.y = pi / 4
        label("G", (0, badge_loc[1] - 0.011, badge_loc[2] - 0.031), 0.078, denim, body)
        face_parent = body
        self.nod_pivot = None
        if name == "Bob" and args.shot == "cover":
            # The upper capsule bends above the bib. Glasses and lips follow
            # the same pivot while the wrists keep their grip in world space.
            self.nod_pivot = face_parent = linked("Bob · signe de tête", parent=body)
            self.neck = V((0, 0, 0.73))
            self.nod_angle = math.radians(11)
            rotation = Matrix.Rotation(self.nod_angle, 3, "X")
            self.nod_shape = head.shape_key_add(name="Inclinaison du front")
            for vertex in self.nod_shape.data:
                pos = vertex.co.copy()
                weight = ease((pos.z - 0.61) / 0.30)
                vertex.co = pos.lerp(self.neck + rotation @ (pos - self.neck), weight)
        shell(
            "Élastique tissé",
            [
                (eye_z - 0.076, radius + 0.017),
                (eye_z - 0.056, radius + 0.027),
                (eye_z + 0.053, radius + 0.027),
                (eye_z + 0.077, radius + 0.012),
            ],
            strap,
            face_parent,
        )
        self.eyes = []
        for n in range(eyes):
            x = 0 if eyes == 1 else (n - 0.5) * 0.49
            r = 0.311 if eyes == 1 else 0.239
            eye = linked(
                "Lunette gauche" if n == 0 else "Lunette droite", parent=face_parent
            )
            eye.location = (
                x,
                -0.89 * radius * math.sqrt(1 - (x / radius) ** 2) + 0.023,
                eye_z,
            )
            eye.rotation_euler.z = x * 0.62
            # Machined barrel with an inset soft gasket and a rounded silver lip.
            br = 72
            verts = []
            faces = []
            rings = [
                (0.0, r + 0.035),
                (-0.04, r + 0.051),
                (-0.115, r + 0.049),
                (-0.17, r + 0.043),
                (-0.18, r + 0.012),
                (-0.14, r - 0.003),
                (0.00, r - 0.004),
            ]
            for y, rr in rings:
                for j in range(br):
                    a = 2 * pi * j / br
                    verts.append((rr * cos(a), y, rr * sin(a)))
            for i in range(len(rings) - 1):
                for j in range(br):
                    k = (j + 1) % br
                    faces.append(
                        (i * br + j, (i + 1) * br + j, (i + 1) * br + k, i * br + k)
                    )
            mesh("Fût en métal tourné", verts, faces, steel, eye)
            for y, rad, thick, m in [
                (-0.025, r + 0.041, 0.014, rim),
                (-0.072, r + 0.05, 0.009, steel),
                (-0.174, r + 0.029, 0.019, steel),
                (-0.163, r + 0.002, 0.012, strap),
            ]:
                torus("Jonc", (0, y, 0), rad, thick, m, eye)
            for side in [-1, 1]:
                sphere(
                    "Attache de lunette",
                    (side * (r + 0.041), -0.031, 0),
                    (0.048, 0.083, 0.060),
                    rim,
                    eye,
                )
                sphere(
                    "Vis",
                    (side * (r + 0.077), -0.050, 0),
                    (0.016, 0.031, 0.030),
                    steel,
                    eye,
                )
            sphere(
                "Globe oculaire",
                (0, -0.096, 0),
                (r * 0.99, 0.139, r * 0.99),
                white,
                eye,
            )
            gaze = linked("Regard", parent=eye)
            gaze.location = (0, -0.225, 0)
            sphere(
                "Anneau limbique",
                (0, 0.001, 0),
                (r * 0.51, 0.027, r * 0.51),
                mouth,
                gaze,
            )
            sphere(
                "Iris",
                (0, -0.012, 0),
                (r * 0.478, 0.023, r * 0.478),
                hazel if name == "Bob" and n == 0 else amber,
                gaze,
            )
            sphere(
                "Pupille", (0, -0.031, 0), (r * 0.247, 0.013, r * 0.247), pupil, gaze
            )
            sphere(
                "Reflet doux",
                (-r * 0.14, -0.045, r * 0.18),
                (r * 0.084, 0.004, r * 0.098),
                glint,
                gaze,
            )
            sphere(
                "Reflet secondaire",
                (r * 0.15, -0.042, -r * 0.068),
                (r * 0.031, 0.003, r * 0.029),
                glint,
                gaze,
            )

            # Rotate a hemisphere inside a scaled parent so the lid follows the eye
            # throughout a blink, including the exposed surface of the iris.
            socket = linked("Orbite", parent=eye)
            socket.location.y = -0.097
            socket.scale = (r * 1.018, 0.201, r * 1.018)
            segments = 64
            verts, faces = [], []
            for row in range(17):
                lat = pi * row / 32
                for j in range(segments):
                    a = 2 * pi * j / segments
                    verts.append((cos(lat) * sin(a), -cos(lat) * cos(a), sin(lat)))
            for row in range(16):
                for j in range(segments):
                    n = row * segments + j
                    k = row * segments + (j + 1) % segments
                    faces.append((n, k, k + segments, n + segments))
            lid = mesh("Paupière supérieure", verts, faces, skin, socket)
            lower = linked("Paupière inférieure", lid.data, socket)
            lower.scale.z = -1
            self.eyes.append((eye, gaze, lid, lower, r))
        self.mouth_shapes = make_mouth(
            face_parent, radius_at, eye_z - (0.47 if eyes == 1 else 0.38)
        )
        if name != "Bob":
            for j in range(21 if name == "Stuart" else 13):
                t = j / (20 if name == "Stuart" else 12)
                s = (-1) ** j
                d = (t - 0.5) * 0.29
                if name == "Kevin":
                    pts = [
                        (s * 0.028, d, top - 0.028),
                        (s * 0.05, d + 0.014, top + 0.083),
                        (s * (0.095 + 0.085 * t), d + 0.047, top + 0.17 - 0.055 * t),
                    ]
                else:
                    pts = [
                        (s * 0.014, d, top - 0.01),
                        (s * 0.21, d + 0.014, top - 0.036),
                        (s * 0.41, d + 0.07, top - 0.19),
                    ]
                line = tube("Mèche", pts, 0.007, hair, body)
                line.data.splines[0].bezier_points[-1].radius = 0.09
        self.arms = []
        self.feet = []
        for side in [-1, 1]:
            arm = tube(
                "Bras articulé",
                [(0, 0, 0), (0.1, 0, 0.1), (0.2, 0, 0.2)],
                0.079,
                skin,
                body,
            )
            glove = Glove(body, side)
            self.arms.append((side, arm, glove))
            foot = linked("Jambe", parent=self.root)
            foot.location.x = side * radius * 0.46
            sphere("Pantalon", (0, 0, 0.283), (0.15, 0.15, 0.18), denim, foot)
            sphere("Bottine", (0, -0.049, 0.131), (0.171, 0.205, 0.124), rubber, foot)
            sphere("Semelle", (0, -0.071, 0.067), (0.175, 0.215, 0.064), strap, foot)
            self.feet.append(foot)

    def pose(
        self,
        frame,
        position,
        yaw,
        lean,
        targets,
        walk,
        blink,
        tilt=0,
        *,
        grips=(0.75, 0.75),
        focus,
        effort=0.15,
        surprise=0,
        relief=0.15,
        compression=0,
        load=0,
        surface=None,
        fruit_hands=(-1, 1),
        rear_hand=0,
        nod=0,
    ):
        self.root.location = position
        self.root.rotation_euler.z = yaw
        self.body.location.z = (
            -compression
            - lean * 0.12
            + abs(sin(walk)) * 0.019
            + 0.008 * sin(frame * 0.106)
        )
        self.body.rotation_euler = (lean * 0.24, tilt, 0)
        for o, prop in [
            (self.root, "location"),
            (self.root, "rotation_euler"),
            (self.body, "location"),
            (self.body, "rotation_euler"),
        ]:
            key(o, prop, frame)
        parent_matrix = self.root.matrix_basis @ self.body.matrix_basis
        inv = parent_matrix.inverted()
        for (s, arm, hand), target, squeeze in zip(self.arms, targets, grips):
            glove = hand.root
            start = V((s * self.r * 0.94, 0.015, self.shoulder))
            rest = V(
                (
                    s * (self.r + 0.095),
                    -0.12 + 0.09 * s * sin(walk),
                    self.shoulder - 0.48,
                )
            )
            wrist = rest if target is None else inv @ V(target)
            bend = start.lerp(wrist, 0.49) + V(
                (s * (0.12 + 0.06 * load), 0.07, -0.13 - 0.13 * load)
            )
            for bp, co in zip(arm.data.splines[0].bezier_points, [start, bend, wrist]):
                bp.co = co
                bp.keyframe_insert(data_path="co", frame=frame)
            glove.location = wrist
            # The palm scoops up under the fruit and rolls outward on release.
            glove.rotation_euler = (
                -0.88 * (1 - squeeze) + 0.03 * squeeze,
                -s * (0.37 - 0.30 * squeeze),
                -s * 0.22 - yaw * squeeze,
            )
            key(glove, "location", frame)
            key(glove, "rotation_euler", frame)
            back = s == rear_hand
            if back:
                glove.rotation_euler.z += pi * squeeze
                key(glove, "rotation_euler", frame)
            hand.pose(
                frame,
                squeeze,
                load * squeeze,
                parent_matrix @ glove.matrix_basis,
                surface if s in fruit_hands else None,
                back,
            )
        face_matrix = parent_matrix
        if self.nod_pivot:
            pivot = self.nod_pivot
            pivot.rotation_euler.x = nod * self.nod_angle
            pivot.location = self.neck - pivot.rotation_euler.to_matrix() @ self.neck
            self.nod_shape.value = nod
            key(pivot, "rotation_euler", frame)
            key(pivot, "location", frame)
            key(self.nod_shape, "value", frame)
            face_matrix = parent_matrix @ pivot.matrix_basis
        for i, (eye, gaze, lid, lower, r) in enumerate(self.eyes):
            target = (face_matrix @ eye.matrix_basis).inverted() @ V(focus)
            horizontal = math.tanh(1.1 * math.atan2(target.x, max(0.12, -target.y)))
            vertical = math.tanh(
                1.15 * math.atan2(target.z, max(0.20, math.hypot(target.x, target.y)))
            )
            dx = r * 0.44 * horizontal
            dz = r * 0.45 * vertical
            gaze.location = (
                dx,
                -0.096
                - 0.139 * math.sqrt(max(0.32, 1 - (dx / r) ** 2 - (dz / r) ** 2))
                + 0.008,
                dz,
            )
            gaze.rotation_euler = (-vertical * 0.48, 0, horizontal * 0.48)
            asymmetry = (-1 if i == 0 else 1) * (0.045 + 0.13 * effort)
            lid.rotation_euler = (
                -0.87 + 0.43 * effort - 0.38 * surprise + 0.16 * relief + 2.17 * blink,
                asymmetry,
                0,
            )
            lower.rotation_euler.x = (
                1.21 - 0.36 * effort - 0.21 * relief + 0.15 * surprise - 0.40 * blink
            )
            key(gaze, "location", frame)
            key(gaze, "rotation_euler", frame)
            key(lid, "rotation_euler", frame)
            key(lower, "rotation_euler", frame)
        for shape, val in zip(self.mouth_shapes, (effort, surprise, relief)):
            shape.value = val
            key(shape, "value", frame)
        self.cheek.value = min(1, 0.56 * effort + 0.89 * relief)
        key(self.cheek, "value", frame)
        for s, leg in zip([-1, 1], self.feet):
            leg.location.y = s * 0.15 * sin(walk)
            leg.location.z = max(0, s * sin(walk)) * 0.097
            leg.rotation_euler.x = -s * 0.28 * sin(walk)
            key(leg, "location", frame)
            key(leg, "rotation_euler", frame)


# All set dressing, including what is reflected in the goggles, is actual geometry.
def label(text, loc, size, mat, parent=None):
    f = bpy.data.curves.new(text, "FONT")
    f.body = text
    f.align_x = "CENTER"
    f.size = size
    f.extrude = 0.002
    f.space_character = 1.13
    o = linked(text, f, parent)
    o.location = loc
    o.rotation_euler.x = pi / 2
    f.materials.append(mat)
    return o


def area(name, loc, target, power, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "DISK"
    data.size = size
    o = linked(name, data)
    o.location = loc
    orient(o, target)
    return o


def set_build(market):
    plate = (
        Path(__file__).resolve().parents[1]
        / "assets"
        / ("market.webp" if market else "depot.webp")
    )
    picture = bpy.data.images.load(str(plate))
    picture.pack()
    m = material("Décor de fond", (0.25, 0.25, 0.25))
    nt = m.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = picture
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 0.82 if not market else 0.96
    nt.links.new(tex.outputs["Color"], emit.inputs["Color"])
    nt.links.new(emit.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    width = 14.8
    h = width * picture.size[1] / picture.size[0]
    mid = 2.02
    back = mesh(
        "Toile de fond photographique",
        [
            (-width / 2, 7, mid - h / 2),
            (width / 2, 7, mid - h / 2),
            (width / 2, 7, mid + h / 2),
            (-width / 2, 7, mid + h / 2),
        ],
        [(0, 1, 2, 3)],
        m,
        None,
        False,
    )
    uv = back.data.uv_layers.new()
    for loop, xy in zip(uv.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop.uv = xy

    def floor_surface(original):
        mat = original.copy()
        nt = mat.node_tree
        pos = nt.nodes.new("ShaderNodeNewGeometry")
        xyz = nt.nodes.new("ShaderNodeSeparateXYZ")
        fade = nt.nodes.new("ShaderNodeMapRange")
        fade.inputs["From Min"].default_value = 0.48
        fade.inputs["From Max"].default_value = 2.76
        nt.links.new(pos.outputs["Position"], xyz.inputs[0])
        nt.links.new(xyz.outputs["Y"], fade.inputs[0])
        mix_shader = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(fade.outputs[0], mix_shader.inputs[0])
        nt.links.new(nt.nodes["Principled BSDF"].outputs[0], mix_shader.inputs[1])
        nt.links.new(
            nt.nodes.new("ShaderNodeBsdfTransparent").outputs[0], mix_shader.inputs[2]
        )
        nt.links.new(
            mix_shader.outputs[0], nt.nodes["Material Output"].inputs["Surface"]
        )
        return mat

    floorboards = [floor_surface(wood), floor_surface(pale)]
    box(
        "Sol du plateau",
        (0, -1.9, -0.10),
        (16, 10, 0.19),
        floor_surface(plaster) if market else floorboards[0],
        bevel=0,
    )
    if not market:
        for x in range(-7, 8):
            box(
                "Lame de parquet",
                (x * 0.53, -1.8, -0.006),
                (0.524, 10, 0.021),
                floorboards[0] if x % 3 else floorboards[1],
                bevel=0.004,
            )
    else:
        # Real stalls and a scalloped fringe in front of the distant market plate.
        for i in range(21):
            x = -5 + i * 0.50
            m = red if i % 2 else cream
            roof = box(
                "Toile du store", (x, 1.9, 2.98), (0.505, 2.5, 0.053), m, bevel=0.018
            )
            roof.rotation_euler.x = 0.12
            box("Lambrequin", (x, 0.65, 2.76), (0.504, 0.055, 0.21), m, bevel=0.054)
        for x in [-2.6, 2.6]:
            box("Poteau du stand", (x, 0.68, 1.39), (0.085, 0.12, 2.78), teal)
    area("Grande fenêtre", (-4.1, -2.1, 4.8), (0, 0, 1.15), 480, (1, 0.86, 0.69), 2.8)
    area("Rebond bleu", (3.2, -1.9, 2.7), (0, 0, 1.1), 98, (0.64, 0.81, 1), 3.4)
    area(
        "Soleil de fin de journée",
        (1.8, 3.3, 4.7),
        (0, 0, 0.99),
        610,
        (1, 0.71, 0.42),
        2.0,
    )
    area(
        "Reflet fenêtre dans les yeux",
        (-0.75, -4.7, 2.9),
        (0, 0, 1.48),
        39,
        (1, 0.95, 0.85),
        1.45,
    )


def counter(loc):
    g = linked("Étal du marché")
    g.location = loc
    box("Face bleu pétrole", (0, 0, 0.40), (3, 0.62, 0.79), teal, g)
    for x in [-1.35, -0.91, -0.47, -0.03, 0.41, 0.85, 1.29]:
        box("Cadre mouluré", (x, -0.327, 0.39), (0.031, 0.033, 0.68), wood, g, 0.005)
    box("Plateau", (0, 0, 0.836), (3.15, 0.77, 0.11), pale, g)
    box("Fronton", (0, -0.35, 0.49), (1.51, 0.04, 0.30), cream, g)
    label("BANANES", (0, -0.373, 0.414), 0.18, teal, g)
    return g


set_build(args.shot in ("marche", "vente"))
shot = args.shot
cover = shot == "cover"
hero_name = {
    "cover": "Kevin",
    "depart": "Kevin",
    "achat": "Stuart",
    "marche": "Bob",
    "vente": "Bob",
}[shot]
lead = Actor(hero_name)
partner = (
    Actor("Stuart" if shot == "marche" else "Client" if shot == "vente" else "Bob")
    if shot in ("cover", "marche", "vente")
    else None
)
if cover or shot == "depart":
    left = crate(None, (-1.08, -0.46, 0.26), True)
    right = crate(None, (0.87, -0.47, 0.26), False)
    box("Table de tri", (0, -0.46, 0.18), (3.34, 0.95, 0.15), wood)
    for x in [-1.48, 1.48]:
        box("Pied de table", (x, -0.40, 0.09), (0.13, 0.15, 0.18), teal)
elif shot == "achat":
    carried = crate(None, (0, 0, 0), True)
    box("Panneau réserve", (1.7, 1.91, 1.83), (1.48, 0.12, 0.43), teal)
    label("RÉSERVE", (1.70, 1.839, 1.74), 0.22, cream)
else:
    counter((0.15, -0.55, 0))
    if shot == "marche":
        carried = crate(None, (-1.0, -0.45, 0.91), True)
    else:
        crate(None, (-1.82, -0.30, 0.90), True)
        token = sphere(
            "Pièce payée au stand", (0, 0, 0), (0.095, 0.023, 0.095), coinmat
        )
prop = fruit(None) if shot != "achat" else None

fruit_surface = PeelContact(prop) if prop is not None else None

camdata = bpy.data.cameras.new("Objectif cinéma")
cam = linked("Caméra du plan", camdata)
sc.camera = cam
camdata.lens = {"cover": 46, "depart": 48, "achat": 47, "marche": 46, "vente": 51}[shot]
camdata.dof.use_dof = True
camdata.dof.aperture_fstop = 1.45
camdata.dof.aperture_blades = 9
if cover:
    insert_data = camdata.copy()
    insert_data.lens = 48
    insert_data.dof.aperture_fstop = 2.8
    insert_cam = linked("Contrechamp · passage de main", insert_data)
    reaction_data = camdata.copy()
    reaction_data.lens = 47
    reaction_data.dof.aperture_fstop = 3.0
    reaction_cam = linked("Caméra · les deux visages", reaction_data)
    for frame, camera, name in [
        (1, cam, "La levée"),
        (45, insert_cam, "Le passage de main"),
        (83, reaction_cam, "La réception"),
        (145, cam, "La dépose"),
    ]:
        sc.timeline_markers.new(name, frame=frame).camera = camera


def grip(p, side, spread=0.31):
    x = side * spread
    underneath = V((x, -0.165, 0.29 * (x / 0.42) ** 2 - 0.053))
    return V(p) + prop.rotation_euler.to_matrix() @ underneath


def reach(rest, target, strength):
    return mix(rest, target, strength)


def pulse(t, center, width):
    return max(0, 1 - abs(t - center) / width)


def point(pos):
    return V(pos)


def handoff_take(frame):
    def beat(start, end):
        return ease((frame - start) / (end - start))

    # The bunch stays on the crate as Kevin closes his fingers and braces.
    lift = beat(23, 41)
    offer = beat(39, 61)
    support = beat(62, 71)
    catch = beat(69, 76)
    recover = beat(76, 86)
    lower = beat(141, 162)
    touchdown = beat(162, 166)
    p = V(
        (
            -0.97 + 0.24 * lift + 0.94 * offer - 0.09 * catch + 0.71 * lower,
            -0.53 - 0.075 * offer + 0.073 * lower,
            0.65
            + 0.39 * lift
            + 0.095 * sin(pi * offer)
            - 0.18 * catch
            + 0.095 * recover
            - 0.34 * lower
            - 0.022 * touchdown,
        )
    )
    prop.location = p
    prop.rotation_euler = (
        0.06 + 0.095 * offer - 0.055 * lower,
        -0.09
        + 0.21 * sin(pi * lift)
        - 0.055 * offer
        + 0.255 * catch
        - 0.17 * recover
        + 0.05 * lower,
        -0.15 + 0.26 * offer - 0.13 * lower,
    )
    bunch_rotation = prop.rotation_euler.to_matrix()

    def underneath(x, y):
        # Contact follows the curved underside of the moving fruit in its own space.
        z = 0.29 * (x / 0.42) ** 2 - 0.048
        return p + bunch_rotation @ V((x, y, z))

    kx = -0.86 + 0.21 * offer - 0.08 * beat(76, 88)
    bx = 0.92 - 0.15 * beat(43, 61) + 0.24 * beat(65, 79) - 0.09 * lower
    kclose = (beat(5, 13) * (1 - beat(56, 64)), beat(8, 17) * (1 - beat(70, 78)))
    # The near palm catches the bunch first; the fingers cinch as its weight arrives.
    purchase = 0.66 + 0.34 * beat(69, 77)
    bclose = (
        purchase * beat(51, 61) * (1 - beat(165, 172)),
        beat(57, 67) * (1 - beat(167, 174)),
    )
    ka = (beat(0, 9) * (1 - beat(62, 73)), beat(0, 11) * (1 - beat(76, 88)))
    ba = (beat(39, 54) * (1 - beat(171, 180)), beat(45, 60) * (1 - beat(173, 182)))
    kh = [
        reach(
            (kx + side * 0.60, -0.36, 0.79),
            underneath(x, 0.105 if side == -1 else -0.177),
            at,
        )
        for side, x, at in zip((-1, 1), (-0.30, -0.175), ka)
    ]
    bh = [
        reach(
            (bx + side * 0.57, -0.29, 0.66),
            underneath(x, -0.17 if side == -1 else 0.115),
            at,
        )
        for side, x, at in zip((-1, 1), (0.13, 0.29), ba)
    ]
    anticipation = beat(9, 22) * (1 - beat(24, 37))
    freed = sin(pi * beat(72, 87))
    kload = beat(12, 27) * (1 - support)
    # Kevin checks Bob's face before he commits the weight, then watches the grip.
    klook = mix(p, (bx, -0.27, 1.44), beat(36, 40) * (1 - beat(52, 55)) + beat(84, 89))
    lead.pose(
        frame,
        (kx, 0.115, 0),
        0.12 + 0.55 * beat(36, 51) - 0.18 * beat(89, 158),
        0.16 + 0.65 * anticipation + 0.22 * kload - 0.22 * freed,
        kh,
        0,
        pulse(frame, 33, 2.5) + pulse(frame, 141, 3),
        -0.08 * kload + 0.08 * freed,
        grips=kclose,
        focus=klook,
        effort=0.07 + 0.77 * kload + 0.10 * anticipation,
        relief=0.78 * beat(80, 147),
        compression=0.14 * anticipation + 0.046 * kload - 0.035 * freed,
        load=kload,
        surface=fruit_surface,
        rear_hand=-1,
    )
    # Bob looks at the landing spot a beat before his hands go under it.
    # Eyes lead the chin after recovery. Hold the eyeline before looking at the crate.
    check_kevin = beat(101, 106) * (1 - beat(138, 142))
    head_turn = beat(104, 111) * (1 - beat(140, 147))
    watch_fruit = beat(30, 34) * (1 - check_kevin) * (1 - beat(165, 169))
    blook = mix((kx, -0.32, 1.97), p, watch_fruit)
    bload = support * (1 - beat(159, 166))
    alarm = beat(66, 70) * (1 - beat(79, 87))
    dip = 0.235 * catch - 0.183 * recover + 0.095 * lower - 0.146 * beat(164, 175)
    partner.pose(
        frame,
        (bx, 0.08, 0.12),
        -0.50
        - 0.13 * beat(37, 54)
        + 0.48 * beat(66, 77)
        - 0.19 * head_turn
        - 0.08 * lower,
        0.10
        + 0.19 * offer
        - 0.60 * catch
        + 0.57 * recover
        - 0.18 * head_turn
        + 0.20 * lower
        - 0.46 * beat(164, 176),
        bh,
        0,
        pulse(frame, 24, 3) + pulse(frame, 154, 2.7),
        -0.035 * offer + 0.131 * catch - 0.084 * recover,
        nod=beat(114, 121) * (1 - beat(123, 133)),
        grips=bclose,
        focus=blook,
        effort=0.12 + 0.48 * bload * (1 - alarm),
        surprise=0.86 * alarm,
        relief=0.44 * head_turn + 0.74 * beat(164, 176),
        compression=dip - 0.075 * beat(42, 55) * (1 - catch),
        load=bload,
        surface=fruit_surface,
        rear_hand=1,
    )
    focus = V((0.025 + 0.06 * offer, -0.22, 1.29))
    camera = V((0.36 + 0.18 * offer, -6.29 + 0.15 * offer, 1.96 - 0.10 * offer))
    return focus, camera


def animation(frame):
    t = (frame - 1) / (sc.frame_end - 1)
    blink = lambda c: pulse(t, c, 0.035)
    arc = sin(pi * t)
    if cover:
        # Preserve the camera move of the original hand insert.
        t = min((frame - 1) / 145, 1)
        arc = sin(pi * t)
        focus, camera = handoff_take(frame)
    elif shot == "depart":
        up = ease(t / 0.32)
        handoff = ease((t - 0.26) / 0.42)
        down = ease((t - 0.66) / 0.31)
        last_stride = ease((t - 0.60) / 0.34)
        x = -1.05 + 0.40 * up + 0.91 * handoff + 0.61 * last_stride
        p = point((x, -0.63, 0.66 + 0.51 * up + 0.15 * sin(pi * handoff) - 0.55 * down))
        lx = -0.81 + 0.86 * handoff + 0.61 * last_stride
        prop.location = p
        prop.rotation_euler = (
            0.12,
            0.18 * sin(pi * handoff) - 0.15 * down,
            -0.19 + 0.26 * handoff,
        )
        a = 1 - ease((t - 0.91) / 0.09)
        h = [reach((lx + s * 0.61, -0.39, 0.92), grip(p, s), a) for s in [-1, 1]]
        lead.pose(
            frame,
            (lx, 0.10, 0),
            0.16 + 0.32 * handoff,
            0.36 * (1 - up) + 0.13 * arc + 0.20 * down,
            h,
            2 * pi * (handoff + last_stride),
            blink(0.24) + blink(0.87),
            -0.032 * arc,
            grips=(a * ease(t / 0.095), a * ease(t / 0.12)),
            focus=p,
            effort=0.24 + 0.54 * sin(pi * up) + 0.18 * handoff * (1 - down),
            relief=0.54 * down,
            load=a * 0.62,
            surface=fruit_surface,
        )
        focus = point((lx + 0.10, -0.26, 1.34))
        camera = point((-0.86 + 0.90 * t, -5.74, 1.88 + 0.13 * cos(pi * t)))
    elif shot == "achat":
        move = ease(t)
        x = -1.30 + 2.30 * move
        phase = 4 * pi * move
        base = point((x + 0.26, -0.46, 0.48 + 0.035 * abs(sin(phase))))
        carried.location = base
        carried.rotation_euler = (0.035, 0.024 * sin(phase), 0.64)
        key(carried, "location", frame)
        key(carried, "rotation_euler", frame)
        lead.pose(
            frame,
            (x, 0.14, 0),
            0.73,
            0.20,
            [base + V((s * 0.47, s * 0.35, 0.25)) for s in [-1, 1]],
            phase,
            blink(0.67),
            0.027 * sin(phase),
            grips=(0.94, 0.96),
            load=0.78,
            effort=0.43 + 0.16 * abs(sin(phase)),
            focus=mix(
                base + V((0, -0.2, 0.38)),
                (2.7, -1.4, 1.75),
                0.27 + 0.70 * ease((t - 0.1) / 0.32),
            ),
        )
        focus = point((x * 0.48 + 0.14, -0.05, 1.11))
        camera = point((x * 0.42 + 0.62, -5.65, 1.46 + 0.07 * arc))
    elif shot == "marche":
        u = ease((t - 0.08) / 0.7)
        lift = sin(pi * u)
        approach = ease(t / 0.25)
        bx = 0.60 - 0.12 * lift
        origin = point((-1.16 + 0.39 * approach, -0.42, 1.00))
        carried.location = origin - V((0, 0, 0.08))
        key(carried, "location", frame)
        p = mix(origin + V((0.08, -0.03, 0.36)), (0.65, -0.72, 0.94), u)
        p.z += 0.29 * lift
        prop.location = p
        prop.rotation_euler = (0.07, 0.18 * lift, 0.07 + 0.24 * u)
        b = ease(t / 0.23) * (1 - ease((t - 0.82) / 0.18))
        bh = [reach((bx + s * 0.55, -0.12, 0.81), grip(p, s, 0.27), b) for s in [-1, 1]]
        lead.pose(
            frame,
            (bx, 0.095, 0.45),
            -0.38 + 0.36 * u,
            0.18 + 0.19 * lift,
            bh,
            0,
            blink(0.55),
            -0.07 * lift,
            grips=(b, b * ease(t / 0.21)),
            focus=p,
            effort=0.18 + 0.44 * lift,
            relief=0.55 * u,
            load=0.66 * b,
            surface=fruit_surface,
        )
        partner.pose(
            frame,
            (origin.x, 0.19, 0.53),
            0.21,
            0.27,
            [origin + V((s * 0.55, 0.01, 0.15)) for s in [-1, 1]],
            pi * 2 * approach,
            blink(0.33),
            grips=(0.88, 0.95),
            load=0.60,
            focus=p,
            effort=0.45 - 0.3 * u,
            relief=0.45 * u,
        )
        focus = point((-0.03 + 0.17 * t, -0.18, 1.52))
        camera = point((-0.68 + 0.46 * t, -5.68, 1.85))
    else:
        u = ease((t - 0.17) / 0.55)
        v = ease((t - 0.11) / 0.53)
        lx = -0.73
        rx = 0.86
        p = mix((-0.65, -0.63, 1.07), (0.82, -0.67, 1.23), u)
        p.z += 0.22 * sin(pi * u)
        prop.location = p
        prop.rotation_euler = (0.07, 0.14 * sin(pi * u), 0.20 * u)
        cp = mix((0.61, -0.87, 1.14), (-0.66, -0.88, 1.12), v)
        cp.z += 0.07 * sin(pi * v)
        token.location = cp
        token.rotation_euler = (0.12, 0, -0.25 + 0.5 * v)
        key(token, "location", frame)
        key(token, "rotation_euler", frame)
        # The forward hands exchange the fruit, the two lower hands exchange the coin.
        give = 1 - ease((t - 0.46) / 0.22)
        get = ease((t - 0.21) / 0.28)
        h = [
            reach(
                (lx - 0.34, -0.21, 1.02),
                cp + V((-0.038, 0.055, -0.039)),
                ease((t - 0.25) / 0.32),
            ),
            reach((lx + 0.49, -0.22, 0.97), grip(p, -1, 0.19), give),
        ]
        bh = [
            reach((rx - 0.49, -0.21, 1.13), grip(p, 1, 0.17), get),
            reach(
                (rx + 0.42, -0.28, 1.04),
                cp + V((0.040, 0.055, -0.035)),
                1 - ease((t - 0.42) / 0.22),
            ),
        ]
        lead.pose(
            frame,
            (lx, 0.12, 0.47),
            0.28,
            0.17 + 0.23 * sin(pi * u),
            h,
            0,
            blink(0.73),
            -0.035 * arc,
            grips=(ease((t - 0.25) / 0.32), give),
            surface=fruit_surface,
            fruit_hands=(1,),
            focus=mix(p, cp, ease((t - 0.45) / 0.12)),
            effort=0.18 * give,
            relief=0.72 * u,
        )
        partner.pose(
            frame,
            (rx, 0.11, 0.28),
            -0.35,
            0.12 + 0.25 * sin(pi * u),
            bh,
            0,
            blink(0.3),
            0.03 * arc,
            grips=(get, 1 - ease((t - 0.42) / 0.22)),
            surface=fruit_surface,
            fruit_hands=(-1,),
            focus=mix(cp, p, ease((t - 0.18) / 0.11)),
            effort=0.18 * get,
            relief=0.55 * u,
        )
        focus = point((0.04 + 0.085 * t, -0.31, 1.48))
        camera = point((0.62 - 0.35 * t, -6.15, 1.65 + 0.06 * arc))
    if prop:
        key(prop, "location", frame)
        key(prop, "rotation_euler", frame)
    if cover:
        # Let the bunch dip in the frame so the viewer sees the weight shift.
        settle = ease((frame - 60) / 9)
        target = prop.location + V((0.07, -0.07, 0.14))
        target.z += (1.18 - target.z) * settle
        insert_cam.location = V((0.03 + 0.22 * t, -3.06, 1.64 + 0.07 * arc))
        orient(insert_cam, target)
        insert_data.dof.focus_distance = (target - insert_cam.location).length
        key(insert_cam, "location", frame)
        key(insert_cam, "rotation_euler", frame)
        insert_data.keyframe_insert(data_path="dof.focus_distance", frame=frame)
        # One locked two-shot keeps the waiting eyes and the answer visible.
        reaction_target = V((0.09, -0.23, 1.61))
        reaction_cam.location = V((0.20, -4.58, 1.85))
        orient(reaction_cam, reaction_target)
        reaction_data.dof.focus_distance = (
            reaction_target - reaction_cam.location
        ).length
        key(reaction_cam, "location", frame)
        key(reaction_cam, "rotation_euler", frame)
        reaction_data.keyframe_insert(data_path="dof.focus_distance", frame=frame)
    cam.location = camera
    orient(cam, focus)
    camdata.dof.focus_distance = (focus - camera).length
    key(cam, "location", frame)
    key(cam, "rotation_euler", frame)
    camdata.keyframe_insert(data_path="dof.focus_distance", frame=frame)


for fr in sorted(set(range(1, sc.frame_end + 1, 1 if cover else 2)) | {sc.frame_end}):
    animation(fr)
args.out.mkdir(parents=True, exist_ok=True)
sc.frame_set(1)
if args.save:
    bpy.ops.wm.save_as_mainfile(
        filepath=str(args.out / (shot + ".blend")), compress=True
    )
if args.still:
    sc.frame_set(args.still)
    sc.render.filepath = str(args.out / (shot + "-look.png"))
    bpy.ops.render.render(write_still=True)
else:
    folder = args.out / shot
    folder.mkdir(exist_ok=True)
    sc.frame_start = args.start
    sc.frame_end = args.end or sc.frame_end
    sc.render.filepath = str(folder / "take-")
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.image_settings.compression = 14
    bpy.ops.render.render(animation=True)

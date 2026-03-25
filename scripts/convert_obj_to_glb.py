#!/usr/bin/env python3
"""
Convert RuneLite Model Exporter OBJ+MTL files to GLB with vertex colors.

Usage:
    python3 convert_obj_to_glb.py input.obj output.glb

Requires: pip install pygltflib numpy

The OBJ must have an accompanying .mtl file (same directory, referenced via mtllib).
The MTL contains per-face Kd RGB colors from the OSRS game engine.
"""

import sys
import os
import numpy as np
import pygltflib
from collections import defaultdict


def parse_mtl(mtl_path):
    """Parse MTL file, return dict of material_name -> [r, g, b]."""
    materials = {}
    current = None
    with open(mtl_path) as f:
        for line in f:
            parts = line.strip().split()
            if not parts:
                continue
            if parts[0] == 'newmtl':
                current = parts[1]
            elif parts[0] == 'Kd' and current:
                materials[current] = [float(parts[1]), float(parts[2]), float(parts[3])]
    return materials


def parse_obj(obj_path):
    """Parse OBJ file, return vertices and faces with material assignments."""
    vertices = []
    faces = []  # list of (v0, v1, v2, material_name)
    current_material = None
    mtl_file = None

    with open(obj_path) as f:
        for line in f:
            parts = line.strip().split()
            if not parts:
                continue
            if parts[0] == 'mtllib':
                mtl_file = ' '.join(parts[1:])
            elif parts[0] == 'v':
                vertices.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == 'usemtl':
                current_material = parts[1]
            elif parts[0] == 'f':
                fv = [int(p.split('/')[0]) - 1 for p in parts[1:]]
                if len(fv) == 3:
                    faces.append((fv[0], fv[1], fv[2], current_material))
                elif len(fv) == 4:
                    faces.append((fv[0], fv[1], fv[2], current_material))
                    faces.append((fv[0], fv[2], fv[3], current_material))

    return np.array(vertices, dtype=np.float32), faces, mtl_file


def build_glb(obj_verts, faces, materials, output_path):
    """Build GLB with per-face vertex colors and smooth normals."""
    num_faces = len(faces)
    num_out_verts = num_faces * 3

    positions = np.zeros((num_out_verts, 3), dtype=np.float32)
    normals = np.zeros((num_out_verts, 3), dtype=np.float32)
    colors = np.zeros((num_out_verts, 4), dtype=np.float32)
    indices = np.arange(num_out_verts, dtype=np.uint32)

    for fi, (i0, i1, i2, mtl_name) in enumerate(faces):
        v0, v1, v2 = obj_verts[i0], obj_verts[i1], obj_verts[i2]

        positions[fi*3+0] = v0
        positions[fi*3+1] = v1
        positions[fi*3+2] = v2

        # Face normal
        e1, e2 = v1 - v0, v2 - v0
        fn = np.cross(e1, e2)
        mag = np.linalg.norm(fn)
        if mag > 0:
            fn /= mag
        normals[fi*3+0] = fn
        normals[fi*3+1] = fn
        normals[fi*3+2] = fn

        # Color from material
        if mtl_name and mtl_name in materials:
            r, g, b = materials[mtl_name]
        else:
            r, g, b = 0.5, 0.5, 0.5

        for vi in range(3):
            colors[fi*3+vi] = [r, g, b, 1.0]

    # Smooth normals by averaging at shared positions
    pos_key = np.round(positions, 1)
    accum = defaultdict(lambda: np.zeros(3))
    pos_to_verts = defaultdict(list)
    for i in range(num_out_verts):
        key = tuple(pos_key[i])
        accum[key] += normals[i]
        pos_to_verts[key].append(i)

    smooth_normals = normals.copy()
    for key, vis in pos_to_verts.items():
        avg = accum[key]
        mag = np.linalg.norm(avg)
        if mag > 0:
            avg = avg / mag
        for vi in vis:
            smooth_normals[vi] = avg

    # Build GLB binary
    idx_bytes = indices.tobytes()
    pos_bytes = positions.tobytes()
    norm_bytes = smooth_normals.astype(np.float32).tobytes()
    color_bytes = colors.tobytes()
    total = len(idx_bytes) + len(pos_bytes) + len(norm_bytes) + len(color_bytes)

    pos_min = positions.min(axis=0).tolist()
    pos_max = positions.max(axis=0).tolist()

    glb = pygltflib.GLTF2(
        scene=0, scenes=[pygltflib.Scene(nodes=[0])],
        nodes=[pygltflib.Node(mesh=0)],
        meshes=[pygltflib.Mesh(primitives=[pygltflib.Primitive(
            attributes=pygltflib.Attributes(POSITION=1, NORMAL=2, COLOR_0=3),
            indices=0, material=0, mode=4)])],
        accessors=[
            pygltflib.Accessor(bufferView=0, componentType=pygltflib.UNSIGNED_INT,
                              count=len(indices), type=pygltflib.SCALAR,
                              max=[int(indices.max())], min=[int(indices.min())]),
            pygltflib.Accessor(bufferView=1, componentType=pygltflib.FLOAT,
                              count=num_out_verts, type=pygltflib.VEC3,
                              max=pos_max, min=pos_min),
            pygltflib.Accessor(bufferView=2, componentType=pygltflib.FLOAT,
                              count=num_out_verts, type=pygltflib.VEC3),
            pygltflib.Accessor(bufferView=3, componentType=pygltflib.FLOAT,
                              count=num_out_verts, type=pygltflib.VEC4),
        ],
        bufferViews=[
            pygltflib.BufferView(buffer=0, byteOffset=0, byteLength=len(idx_bytes)),
            pygltflib.BufferView(buffer=0, byteOffset=len(idx_bytes), byteLength=len(pos_bytes)),
            pygltflib.BufferView(buffer=0, byteOffset=len(idx_bytes)+len(pos_bytes), byteLength=len(norm_bytes)),
            pygltflib.BufferView(buffer=0, byteOffset=len(idx_bytes)+len(pos_bytes)+len(norm_bytes), byteLength=len(color_bytes)),
        ],
        buffers=[pygltflib.Buffer(byteLength=total)],
        materials=[pygltflib.Material(
            pbrMetallicRoughness=pygltflib.PbrMetallicRoughness(
                baseColorFactor=[1, 1, 1, 1], metallicFactor=0.0, roughnessFactor=0.85),
            doubleSided=True, alphaMode=pygltflib.OPAQUE)],
    )
    glb.set_binary_blob(idx_bytes + pos_bytes + norm_bytes + color_bytes)
    glb.save(output_path)

    print(f"Saved {output_path}: {total} bytes, {num_out_verts} verts, {num_faces} faces, {len(materials)} colors")


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 convert_obj_to_glb.py input.obj output.glb")
        sys.exit(1)

    obj_path = sys.argv[1]
    output_path = sys.argv[2]

    # Parse OBJ
    obj_verts, faces, mtl_filename = parse_obj(obj_path)
    print(f"OBJ: {len(obj_verts)} vertices, {len(faces)} faces")

    # Find and parse MTL
    if mtl_filename:
        mtl_path = os.path.join(os.path.dirname(obj_path), mtl_filename)
    else:
        mtl_path = obj_path.replace('.obj', '.mtl')

    if not os.path.exists(mtl_path):
        print(f"WARNING: MTL file not found at {mtl_path}")
        print("Colors will be grey. Re-export with 'Export Color' enabled in Model Exporter.")
        materials = {}
    else:
        materials = parse_mtl(mtl_path)
        print(f"MTL: {len(materials)} materials loaded")

    build_glb(obj_verts, faces, materials, output_path)


if __name__ == '__main__':
    main()

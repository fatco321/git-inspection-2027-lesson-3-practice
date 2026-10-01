import type { Scene } from '@babylonjs/core/scene';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';

/** Compact desktop printer. Origin is the bottom centre; the front faces +Z. */
export function createPrinter(scene: Scene, shadows: ShadowGenerator, origin: Vector3): void {
  const material = (name: string, color: string) => {
    const mat = new StandardMaterial(`printer-${name}`, scene);
    mat.diffuseColor = Color3.FromHexString(color);
    mat.specularColor = Color3.FromHexString('#252525');
    return mat;
  };
  const shell = material('shell', '#dddcd5');
  const lid = material('lid', '#aab7b8');
  const dark = material('dark', '#354549');
  const paper = material('paper', '#fff8e9');
  const button = material('button', '#55958a');
  const part = (name: string, size: [number, number, number], position: [number, number, number], mat: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(`printer-${name}`, { width: size[0], height: size[1], depth: size[2] }, scene);
    mesh.position.copyFrom(origin).addInPlace(Vector3.FromArray(position));
    mesh.material = mat;
    mesh.receiveShadows = true;
    shadows.addShadowCaster(mesh);
    return mesh;
  };

  part('base', [0.7, 0.045, 0.44], [0, 0.0225, 0], dark);
  part('body', [0.72, 0.24, 0.44], [0, 0.165, 0], shell);
  part('scanner-edge', [0.75, 0.025, 0.46], [0, 0.2975, 0], dark);
  part('scanner-lid', [0.75, 0.045, 0.46], [0, 0.3325, 0], lid);
  part('output-slot', [0.48, 0.065, 0.008], [0, 0.19, 0.224], dark);
  part('output-tray', [0.49, 0.018, 0.14], [0, 0.15, 0.265], dark);
  part('printed-sheet', [0.21, 0.004, 0.297], [0, 0.164, 0.19], paper);
  part('control-panel', [0.14, 0.009, 0.07], [0.235, 0.3595, 0.155], dark);
  part('power-button', [0.03, 0.006, 0.025], [0.265, 0.367, 0.155], button);
}

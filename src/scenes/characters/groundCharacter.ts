import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

/** Compute once in idle, using skinned vertices rather than bind-pose bounds. */
export function groundedCharacterY(
  container: AssetContainer,
  root: TransformNode,
  surfaceY = 0,
): number {
  for (const node of container.transformNodes) node.computeWorldMatrix(true);
  for (const skeleton of container.skeletons) skeleton.prepare(true);
  let bottom = Infinity;
  for (const mesh of container.meshes) {
    const positions = mesh.getPositionData(true);
    if (!positions) continue;
    const world = mesh.computeWorldMatrix(true);
    for (let i = 0; i < positions.length; i += 3) {
      bottom = Math.min(
        bottom,
        Vector3.TransformCoordinates(Vector3.FromArray(positions, i), world).y,
      );
    }
  }
  return Number.isFinite(bottom)
    ? root.position.y + surfaceY - 0.004 - bottom
    : root.position.y;
}

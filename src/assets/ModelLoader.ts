import type { Scene } from "@babylonjs/core/scene";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/loaders/glTF";
import "@babylonjs/loaders/OBJ";

export type ModelPlacement = {
  x: number;
  y: number;
  z: number;
  height: number;
  rotation?: number;
};

/** Owns imported model containers, their placement roots and late-load cleanup. */
export class ModelLoader {
  private disposed = false;
  private readonly entries: Array<{
    container: AssetContainer;
    pivot: TransformNode;
  }> = [];

  constructor(
    private readonly scene: Scene,
    private readonly shadows: ShadowGenerator,
  ) {}

  async load(
    file: string,
    placement: ModelPlacement,
    name: string,
  ): Promise<AssetContainer | undefined> {
    const container = await LoadAssetContainerAsync(
      `${import.meta.env.BASE_URL}models/${file}`,
      this.scene,
    );
    if (this.disposed) {
      container.dispose();
      return;
    }
    container.addAllToScene();

    const pivot = new TransformNode(`${name}-pivot`, this.scene);
    const offset = new TransformNode(`${name}-offset`, this.scene);
    offset.parent = pivot;
    for (const node of container.rootNodes) node.parent = offset;

    let min = new Vector3(Infinity, Infinity, Infinity);
    let max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const mesh of container.meshes) {
      if (mesh.getTotalVertices() === 0) continue;
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      min = Vector3.Minimize(min, box.minimumWorld);
      max = Vector3.Maximize(max, box.maximumWorld);
      this.shadows.addShadowCaster(mesh);
      mesh.receiveShadows = true;
    }
    if (!Number.isFinite(min.y) || max.y <= min.y) {
      container.dispose();
      pivot.dispose();
      throw new Error(`${name}: неверные границы модели`);
    }

    const scale = placement.height / (max.y - min.y);
    offset.position.set(-(min.x + max.x) / 2, -min.y, -(min.z + max.z) / 2);
    pivot.scaling.setAll(scale);
    pivot.position.set(placement.x, placement.y, placement.z);
    pivot.rotation.y = placement.rotation ?? 0;

    for (const animation of container.animationGroups) animation.stop();
    this.entries.push({ container, pivot });
    return container;
  }

  /** Load an authored scene in metres without recentering its animated roots. */
  async loadAuthored(
    file: string,
    name: string,
    mirrorX = false,
  ): Promise<AssetContainer | undefined> {
    const container = await LoadAssetContainerAsync(
      `${import.meta.env.BASE_URL}models/${file}`,
      this.scene,
    );
    if (this.disposed) {
      container.dispose();
      return;
    }
    container.addAllToScene();
    const pivot = new TransformNode(`${name}-pivot`, this.scene);
    // Coordinate conversion is chosen by the scene; authored metre scale is retained.
    pivot.scaling.x = mirrorX ? -1 : 1;
    for (const node of container.rootNodes) node.parent = pivot;
    for (const mesh of container.meshes) {
      if (!mesh.getTotalVertices()) continue;
      this.shadows.addShadowCaster(mesh);
      mesh.receiveShadows = true;
      mesh.alwaysSelectAsActiveMesh = true;
    }
    for (const animation of container.animationGroups) animation.stop();
    this.entries.push({ container, pivot });
    return container;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const { container, pivot } of this.entries) {
      container.dispose();
      pivot.dispose();
    }
    this.entries.length = 0;
  }
}

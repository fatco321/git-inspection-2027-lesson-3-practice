import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "./ending.css";
const ease = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
/** Departure from each actor's current position, followed by a terminal end screen. */
export class PracticeEnding {
  private elapsed = 0;
  private done = false;
  private readonly actors;
  private readonly rings;
  private readonly sparks;
  private readonly material;
  private readonly panel = document.createElement("section");
  constructor(
    private readonly scene: Scene,
    roots: TransformNode[],
    private readonly complete: () => void,
  ) {
    this.actors = roots.map((root) => ({
      root,
      enabled: root.isEnabled(),
      meshes: root
        .getChildMeshes()
        .map((mesh) => ({ mesh, visibility: mesh.visibility })),
    }));
    this.material = new StandardMaterial("ending-light", scene);
    this.material.disableLighting = true;
    this.material.emissiveColor = Color3.FromHexString("#a6e8de");
    this.rings = roots.flatMap((root, index) =>
      [0, 1].map((layer) => {
        const mesh = MeshBuilder.CreateTorus(
          `ending-ring-${index}-${layer}`,
          { diameter: 1.55, thickness: 0.035, tessellation: 64 },
          scene,
        );
        mesh.material = this.material;
        return { mesh, origin: root.position.clone(), layer };
      }),
    );
    this.sparks = roots.flatMap((root) =>
      Array.from({ length: 24 }, (_, i) => {
        const mesh = MeshBuilder.CreateBox(
          "ending-particle",
          { size: 0.045 },
          scene,
        );
        mesh.material = this.material;
        return {
          mesh,
          origin: root.position.clone(),
          angle: i * 2.4,
          height: ((i % 9) / 9) * 1.6,
        };
      }),
    );
    this.panel.className = "practice-ending";
    this.panel.hidden = true;
    this.panel.setAttribute("role", "status");
    // Arrival is intentionally left for the next scene; hold the departure fade.
    this.panel.classList.add('practice-ending--departure');
    document.body.append(this.panel);
    this.update(0);
  }
  get running() { return !this.done; }
  update(dt: number) {
    if (this.done) return;
    this.elapsed += dt;
    const t = this.elapsed;
    const dissolve = ease((t - 0.55) / 1.45),
      fade = 1 - ease((t - 2) / 0.7);
    this.actors.forEach(({ root, meshes }) => {
      meshes.forEach(
        ({ mesh, visibility }) =>
          (mesh.visibility = visibility * (1 - dissolve)),
      );
      if (dissolve === 1) root.setEnabled(false);
    });
    this.rings.forEach(({ mesh, origin, layer }) => {
      mesh.position.copyFrom(origin);
      mesh.position.y = origin.y + 0.04 + (layer ? ease(t / 2) * 2.3 : 0);
      mesh.visibility = ease(t / 0.3) * fade;
      mesh.scaling.setAll(1 + 0.15 * ease(t / 2));
    });
    this.sparks.forEach(({ mesh, origin, angle, height }) => {
      mesh.position.copyFrom(origin);
      mesh.position.addInPlace(
        new Vector3(
          Math.sin(angle + t) * (0.2 + dissolve * 0.4),
          height + dissolve,
          Math.cos(angle + t) * (0.2 + dissolve * 0.4),
        ),
      );
      mesh.visibility = ease((t - 0.4) / 0.3) * fade;
      mesh.scaling.setAll(1 - dissolve * 0.6);
    });
    if (t >= 3) {
      this.done = true;
      this.rings.forEach(({ mesh }) => mesh.setEnabled(false));
      this.sparks.forEach(({ mesh }) => mesh.setEnabled(false));

      this.panel.hidden = false;
      this.complete();
    }
  }
  revealDestination(){this.panel.classList.add('practice-ending--reveal');}
  dispose() {
    this.actors.forEach(({ root, meshes, enabled }) => {
      root.setEnabled(enabled);
      meshes.forEach(({ mesh, visibility }) => (mesh.visibility = visibility));
    });
    this.panel.remove();
    this.rings.forEach(({ mesh }) => mesh.dispose());
    this.sparks.forEach(({ mesh }) => mesh.dispose());
    this.material.dispose();
  }
}

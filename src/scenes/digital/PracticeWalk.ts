import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { groundedCharacterY } from "../characters/groundCharacter";
import { canStand } from "../workshop/practiceLayout";
type Pose = Array<{ position: Vector3; rotation: Quaternion }>;
export class PracticeWalk {
  private readonly nodes;
  private readonly idle: Pose;
  private readonly frames: Pose[];
  private readonly stride: number;
  private readonly floorY: number;
  private readonly keys = new Set<string>();
  private distance = 0;
  private blend = 0;
  enabled = false;
  private navigation = canStand;
  private indoor = false;
  setIndoor(indoor: boolean, navigation = canStand) {
    this.indoor = indoor;
    this.navigation = navigation;
    this.clear();
  }
  private readonly down = (e: KeyboardEvent) => {
    if (
      !this.enabled ||
      !e.code.startsWith("Arrow") ||
      (e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)))
    )
      return;
    e.preventDefault();
    this.keys.add(e.code);
  };
  private readonly up = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private readonly clear = () => this.keys.clear();
  constructor(
    private readonly root: TransformNode,
    hero: AssetContainer,
    private readonly camera: ArcRotateCamera,
  ) {
    this.nodes = hero.transformNodes;
    const saved = this.capture();
    const sample = (name: string, count: number) => {
      const group = hero.animationGroups.find((item) => item.name === name)!;
      group.start(false);
      group.pause();
      const poses = Array.from({ length: count }, (_, i) => {
        group.goToFrame(group.from + ((group.to - group.from) * i) / count);
        return this.capture();
      });
      group.stop();
      return poses;
    };
    this.idle = sample("Idle_Neutral", 1)[0];
    this.frames = sample("Walk", 40);
    const foot = this.nodes.find((node) => node.name === "Foot.R")!;
    // Project onto the model's forward axis, not world Z (the spawn faces sideways).
    const forwardAxis = Vector3.TransformNormal(
      Vector3.Forward(),
      root.computeWorldMatrix(true),
    ).normalize();
    const forward = this.frames.map((pose) => {
      this.apply(pose, pose, 0);
      for (const node of this.nodes) node.computeWorldMatrix(true);
      foot.computeWorldMatrix(true);
      return Vector3.Dot(
        foot.getAbsolutePosition().subtract(root.position),
        forwardAxis,
      );
    });
    this.stride = Math.max(
      1.2,
      2 * (Math.max(...forward) - Math.min(...forward)),
    );
    this.apply(saved, saved, 0);
    this.apply(this.idle, this.idle, 0);
    this.floorY = groundedCharacterY(hero, root, 0.025);
    root.position.y = this.floorY;
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.clear);
  }
  private capture(): Pose {
    return this.nodes.map((node) => ({
      position: node.position.clone(),
      rotation:
        node.rotationQuaternion?.clone() ??
        Quaternion.FromEulerVector(node.rotation),
    }));
  }
  private apply(a: Pose, b: Pose, t: number): void {
    this.nodes.forEach((node, i) => {
      Vector3.LerpToRef(a[i].position, b[i].position, t, node.position);
      node.rotationQuaternion ??= Quaternion.Identity();
      Quaternion.SlerpToRef(
        a[i].rotation,
        b[i].rotation,
        t,
        node.rotationQuaternion,
      );
    });
  }

  update(dt: number): number {
    if (!this.enabled) { this.apply(this.idle, this.idle, 0); return 0; }
    const forward = this.camera.target.subtract(this.camera.position);
    forward.y = 0;
    forward.normalize();
    const right = new Vector3(forward.z, 0, -forward.x);
    const wish = forward
      .scale(
        Number(this.keys.has("ArrowUp")) - Number(this.keys.has("ArrowDown")),
      )
      .add(
        right.scale(
          Number(this.keys.has("ArrowRight")) -
            Number(this.keys.has("ArrowLeft")),
        ),
      );
    if (wish.lengthSquared() > 0) wish.normalize();
    const old = this.root.position.clone(),
      step = wish.scale(dt * 1.45);
    if (this.navigation(old.x + step.x, old.z)) this.root.position.x += step.x;
    if (this.navigation(this.root.position.x, old.z + step.z))
      this.root.position.z += step.z;
    this.root.position.y = this.floorY;
    const moved = this.root.position.subtract(old),
      metres = Math.hypot(moved.x, moved.z);
    this.distance += metres;
    if (metres > 0.00001) {
      const angle = Math.atan2(moved.x, moved.z);
      this.root.rotation.y +=
        Math.atan2(
          Math.sin(angle - this.root.rotation.y),
          Math.cos(angle - this.root.rotation.y),
        ) * Math.min(1, dt * 14);
    }
    this.blend +=
      ((metres > 0.00001 ? 1 : 0) - this.blend) * Math.min(1, dt * 14);
    const frame =
      ((this.distance / this.stride) * this.frames.length) % this.frames.length;
    this.apply(
      this.frames[Math.floor(frame)],
      this.frames[(Math.floor(frame) + 1) % this.frames.length],
      frame % 1,
    );
    const walk = this.capture();
    this.apply(this.idle, walk, this.blend);
    this.camera.setTarget(
      Vector3.Lerp(
        this.camera.target,
        this.root.position.add(new Vector3(0, 0.8, 0)),
        Math.min(1, dt * 3),
      ),
      false,
      false,
      true,
    );
    return metres;
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.keys.clear();
    if (!enabled) {
      this.blend = 0;
      this.apply(this.idle, this.idle, 0);
    }
  }
  dispose() {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.clear);
  }
}

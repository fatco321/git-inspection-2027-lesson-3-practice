import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

/** Blend both hands into a stable tablet hold after the authored animation. */
export class TabletPose {
  private weight = 0;
  private lean = 0;
  private readonly spine;
  private readonly observer;
  private readonly arms;
  private readonly head: TransformNode;
  private readonly headRest: Quaternion;
  constructor(
    private scene: Scene,
    container: AssetContainer,
    private root: TransformNode,
    private tablet: TransformNode,
  ) {
    const joint = (name: string) =>
      container.transformNodes.find((n) => n.name === name)!;
    // Body also parents the legs, but Foot.L/R are rooted separately.
    // Bend only the spine chain; rotating Body would pull the legs off their feet.
    this.spine = ["Abdomen", "Torso", "Chest"].map((name, i) => {
      const node = joint(name);
      return { node, rest: node.rotationQuaternion!.clone(), share: [0.55, 0.3, 0.15][i] };
    });
    this.head = joint("Head");
    this.headRest = this.head.rotationQuaternion!.clone();
    this.arms = ["L", "R"].map((side) => {
      const upper = joint(`UpperArm.${side}`),
        lower = joint(`LowerArm.${side}`),
        wrist = joint(`Wrist.${side}`);
      return {
        fingers: ["Index", "Middle", "Ring", "Pinky"].flatMap((finger) => [2, 3].map((part) => {
          const node = joint(`${finger}${part}.${side}`);
          return { node, rest: node.rotationQuaternion!.clone(), angle: part === 2 ? -1.05 : -0.8 };
        })),
        upper,
        lower,
        wrist,
        index: joint(`Index2.${side}`),
        pinky: joint(`Pinky2.${side}`),
        a: Vector3.Distance(this.position(upper), this.position(lower)),
        b: Vector3.Distance(this.position(lower), this.position(wrist)),
      };
    });
    this.observer = scene.onAfterAnimationsObservable.add(() => this.apply());
  }
  update(weight: number, lean = 0) {
    this.weight = weight;
    this.lean = lean;
  }
  private position(node: TransformNode) {
    node.computeWorldMatrix(true);
    return node.getAbsolutePosition().clone();
  }
  private aim(node: TransformNode, target: Vector3) {
    const parent = node.parent as TransformNode;
    parent.computeWorldMatrix(true);
    const desired = Vector3.TransformCoordinates(
      target,
      Matrix.Invert(parent.getWorldMatrix()),
    )
      .subtract(node.position)
      .normalize();
    const q =
        node.rotationQuaternion ?? Quaternion.FromEulerVector(node.rotation),
      m = Matrix.Identity();
    Matrix.FromQuaternionToRef(q, m);
    const current = Vector3.TransformNormal(Vector3.Up(), m).normalize(),
      delta = Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(current, desired, delta);
    node.rotationQuaternion = delta.multiply(q).normalize();
    node.computeWorldMatrix(true);
  }
  private apply() {
    if (this.weight <= 0 || !this.root.isEnabled()) return;
    const forward = new Vector3(
      Math.sin(this.root.rotation.y),
      0,
      Math.cos(this.root.rotation.y),
    );
    const right = new Vector3(forward.z, 0, -forward.x),
      origin = this.root.getAbsolutePosition();
    this.head.rotationQuaternion = this.headRest.multiply(Quaternion.RotationAxis(Vector3.Right(), 0.16 * this.weight));
    for (const segment of this.spine) {
      segment.node.rotationQuaternion = segment.rest.clone();
      segment.node.computeWorldMatrix(true);
      if (this.lean <= 0) continue;
      const axis = Vector3.TransformNormal(Vector3.Up(), segment.node.getWorldMatrix()).normalize();
      const bent = Vector3.TransformNormal(axis, Matrix.RotationAxis(right, this.lean * segment.share));
      this.aim(segment.node, this.position(segment.node).add(bent));
    }
    this.arms.forEach((arm) => {
      const nodes = [arm.upper, arm.lower, arm.wrist],
        before = nodes.map((n) => n.rotationQuaternion!.clone());
      const start = this.position(arm.upper),
        sign = Math.sign(Vector3.Dot(start.subtract(origin), right)) || 1;
      // Grip points share the tablet transform, so hands follow its tilt and size.
      this.tablet.computeWorldMatrix(true);

      const grip = Vector3.TransformCoordinates(
        new Vector3(sign * 0.43, -0.20, 0),
        this.tablet.getWorldMatrix(),
      );
      const handForward = Vector3.TransformNormal(
        new Vector3(0, 1, 0),
        this.tablet.getWorldMatrix(),
      ).normalize();
      const target = grip.subtract(handForward.scale(0.075));
      const direction = target.subtract(start).normalize(),
        distance = Math.max(
          Math.abs(arm.a - arm.b) + 0.001,
          Math.min(Vector3.Distance(start, target), arm.a + arm.b - 0.008),
        );
      const along =
        (arm.a * arm.a - arm.b * arm.b + distance * distance) / (2 * distance);
      // Keep the elbow behind and outside the arm, including the reaching pose.
      // A purely downward pole becomes ambiguous as the hand approaches the table.
      const pole = right.scale(sign * 0.32).subtract(forward.scale(0.4)).add(new Vector3(0, -0.65, 0));
      const bend = pole
        .subtract(direction.scale(Vector3.Dot(pole, direction)))
        .normalize();
      const elbow = start
        .add(direction.scale(along))
        .add(bend.scale(Math.sqrt(Math.max(0, arm.a * arm.a - along * along))));
      this.aim(arm.upper, elbow);
      this.aim(arm.lower, start.add(direction.scale(distance)));
      this.aim(arm.wrist, this.position(arm.wrist).add(handForward));
      const measure = () => {
        const across = this.position(arm.index).subtract(
          this.position(arm.pinky),
        );
        return across
          .subtract(handForward.scale(Vector3.Dot(across, handForward)))
          .normalize();
      };
      const across = measure(),
        inward = Vector3.TransformNormal(new Vector3(0, 0, -1), this.tablet.getWorldMatrix()).normalize(),
        roll = Math.atan2(
          Vector3.Dot(handForward, Vector3.Cross(across, inward)),
          Vector3.Dot(across, inward),
        );
      const parent = arm.wrist.parent as TransformNode;
      parent.computeWorldMatrix(true);
      const localAxis = Vector3.TransformNormal(
          handForward,
          Matrix.Invert(parent.getWorldMatrix()),
        ).normalize(),
        base = arm.wrist.rotationQuaternion!.clone();
      let best = base,
        error = Infinity;
      for (const angle of [roll, -roll]) {
        arm.wrist.rotationQuaternion = Quaternion.RotationAxis(
          localAxis,
          angle,
        ).multiply(base);
        arm.wrist.computeWorldMatrix(true);
        const e = 1 - Vector3.Dot(measure(), inward);
        if (e < error) {
          error = e;
          best = arm.wrist.rotationQuaternion.clone();
        }
      }
      arm.wrist.rotationQuaternion = best;
      for (const finger of arm.fingers) {
        finger.node.rotationQuaternion = Quaternion.Slerp(finger.rest, finger.rest.multiply(Quaternion.RotationAxis(Vector3.Right(), finger.angle)), this.weight);
      }
      nodes.forEach((n, j) => {
        n.rotationQuaternion = Quaternion.Slerp(
          before[j],
          n.rotationQuaternion!,
          Math.min(1, this.weight),
        );
        n.computeWorldMatrix(true);
      });
    });
  }
  dispose() {
    this.scene.onAfterAnimationsObservable.remove(this.observer);
  }
}

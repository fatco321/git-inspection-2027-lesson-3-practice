import { seatedPose } from './officeLayout';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';

// The pack has no seated animation. Pose its existing rig using the actual limb lengths.
export function poseAtDesk(container: AssetContainer): void {
  const joint = (name: string): TransformNode => {
    const node = container.transformNodes.find((item) => item.name === name);
    if (!node) throw new Error(`Missing character joint: ${name}`);
    return node;
  };
  const position = (node: TransformNode) => {
    node.computeWorldMatrix(true);
    return node.getAbsolutePosition().clone();
  };
  const aim = (node: TransformNode, target: Vector3) => {
    const parent = node.parent as TransformNode;
    parent.computeWorldMatrix(true);
    const localTarget = Vector3.TransformCoordinates(target, Matrix.Invert(parent.getWorldMatrix()));
    const desired = localTarget.subtract(node.position).normalize();
    const rotation = node.rotationQuaternion ?? Quaternion.FromEulerVector(node.rotation);
    const matrix = Matrix.Identity();
    Matrix.FromQuaternionToRef(rotation, matrix);
    const current = Vector3.TransformNormal(Vector3.Up(), matrix).normalize();
    const delta = Quaternion.Identity();
    Quaternion.FromUnitVectorsToRef(current, desired, delta);
    node.rotationQuaternion = delta.multiply(rotation).normalize();
    node.computeWorldMatrix(true);
  };

  const neutral = container.animationGroups.find((item) => item.name === 'Idle_Neutral');
  if (neutral) {
    neutral.start(false);
    neutral.goToFrame(neutral.from);
    neutral.stop();
  }
  for (const mesh of container.meshes) {
    if (/pistol/i.test(mesh.name)) mesh.setEnabled(false);
    if (mesh.skeleton) mesh.alwaysSelectAsActiveMesh = true;
  }

  const lengths = new Map<string, [number, number]>();
  for (const side of ['L', 'R']) {
    lengths.set(`leg${side}`, [
      Vector3.Distance(position(joint(`UpperLeg.${side}`)), position(joint(`LowerLeg.${side}`))),
      Vector3.Distance(position(joint(`LowerLeg.${side}`)), position(joint(`Foot.${side}`))),
    ]);
    lengths.set(`arm${side}`, [
      Vector3.Distance(position(joint(`UpperArm.${side}`)), position(joint(`LowerArm.${side}`))),
      Vector3.Distance(position(joint(`LowerArm.${side}`)), position(joint(`Wrist.${side}`))),
    ]);
  }

  joint('Body').setAbsolutePosition(new Vector3(seatedPose.centerX, seatedPose.pelvisY, seatedPose.pelvisZ));

  const solve = (upper: TransformNode, lower: TransformNode, target: Vector3, pole: Vector3, lengths: [number, number]): Vector3 => {
    const start = position(upper);
    const [a, b] = lengths;
    const direction = target.subtract(start).normalize();
    const distance = Math.max(Math.abs(a - b) + 0.001, Math.min(Vector3.Distance(start, target), a + b - 0.001));
    const along = (a * a - b * b + distance * distance) / (2 * distance);
    const bend = pole.subtract(direction.scale(Vector3.Dot(pole, direction))).normalize();
    const knee = start.add(direction.scale(along)).add(bend.scale(Math.sqrt(Math.max(0, a * a - along * along))));
    const end = start.add(direction.scale(distance));
    aim(upper, knee);
    aim(lower, end);
    return end;
  };

  for (const side of ['L', 'R']) {
    const legSign = Math.sign(position(joint(`UpperLeg.${side}`)).x - seatedPose.centerX) || 1;
    const armSign = Math.sign(position(joint(`UpperArm.${side}`)).x - seatedPose.centerX) || 1;
    const ankle = solve(joint(`UpperLeg.${side}`), joint(`LowerLeg.${side}`),
      new Vector3(seatedPose.centerX + legSign * seatedPose.ankleSpread, seatedPose.ankleY, seatedPose.ankleZ), new Vector3(0, 0, -1), lengths.get(`leg${side}`)!);
    joint(`Foot.${side}`).setAbsolutePosition(ankle);
    solve(joint(`UpperArm.${side}`), joint(`LowerArm.${side}`),
      new Vector3(seatedPose.centerX + armSign * seatedPose.wristSpread, seatedPose.wristY, seatedPose.wristZ), new Vector3(armSign * 0.25, -1, 0.2), lengths.get(`arm${side}`)!);
    const wrist = joint(`Wrist.${side}`);
    const forward = new Vector3(0, -0.08, -1).normalize();
    aim(wrist, position(wrist).add(forward));
    // Roll each palm toward the keyboard: thumbs point toward the other hand.
    const thumb = position(joint(`Thumb1.${side}`)).subtract(position(joint(`Pinky1.${side}`)));
    const across = thumb.subtract(forward.scale(Vector3.Dot(thumb, forward))).normalize();
    const inward = new Vector3(-armSign, 0, 0);
    const roll = Math.atan2(Vector3.Dot(forward, Vector3.Cross(across, inward)), Vector3.Dot(across, inward));
    const parent = wrist.parent as TransformNode;
    const localAxis = Vector3.TransformNormal(forward, Matrix.Invert(parent.getWorldMatrix())).normalize();
    // The worker rig uses opposite wrist roll conventions on its two sides.
    // Keep the right-hand correction separate from the left wrist.
    const rollSign = side === 'R' ? Math.sign(parent.getWorldMatrix().determinant()) : 1;
    wrist.rotationQuaternion = Quaternion.RotationAxis(localAxis, roll * rollSign).multiply(wrist.rotationQuaternion!);
  }
}

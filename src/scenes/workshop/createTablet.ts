import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";

export function createTablet(scene: Scene, position: Vector3, shadows: ShadowGenerator) {
  const root = new TransformNode("tablet", scene);
  root.position.copyFrom(position);
  root.rotation.x = Math.PI / 2;
  const body = MeshBuilder.CreateBox(
    "tablet body",
    { width: 0.74, height: 0.98, depth: 0.05 },
    scene,
  );
  body.parent = root;
  const frame = new StandardMaterial("tablet graphite", scene);
  frame.diffuseColor = Color3.FromHexString("#233e49");
  frame.specularColor.setAll(0.15);
  body.material = frame;
  body.receiveShadows = true;
  shadows.addShadowCaster(body);
  const display = MeshBuilder.CreatePlane(
    "tablet display",
    { width: 0.66, height: 0.86 },
    scene,
  );
  display.parent = root;
  display.position.z = -0.028;
  const screen = new StandardMaterial("tablet screen", scene);
  screen.disableLighting = true;
  screen.emissiveColor = Color3.White();
  screen.backFaceCulling = false;
  display.material = screen;
  const texture = new DynamicTexture(
    "tablet incoming call",
    { width: 384, height: 512 },
    scene,
    false,
  );
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  const draw = () => {
    ctx.fillStyle = "#173841";
    ctx.fillRect(0, 0, 384, 512);
    ctx.fillStyle = "#b8e1ce";
    ctx.textAlign = "center";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("Инспектор", 192, 95);
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#e1e7db";
    ctx.fillText("Мастерская", 192, 145);
    ctx.beginPath();
    ctx.arc(192, 280, 65, 0, Math.PI * 2);
    ctx.fillStyle = "#72b3a4";
    ctx.fill();
    ctx.fillStyle = "#173841";
    ctx.fillRect(160, 256, 50, 40);
    ctx.beginPath();
    ctx.moveTo(212, 266);
    ctx.lineTo(236, 252);
    ctx.lineTo(236, 300);
    ctx.lineTo(212, 286);
    ctx.fill();
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#cde5d7";
    ctx.fillText("Материалы мероприятия", 192, 400);
    texture.update();
  };
  draw();
  screen.diffuseTexture = texture;
  const portrait = new Texture(
    `${import.meta.env.BASE_URL}images/characters/andrey-cartoon-v2.png`,
    scene,
  );
  let showing = false;
  return {
    root,
    showGuide() {
      if (showing) return;
      showing = true;
      screen.diffuseTexture = portrait;
    },
    showInvitation() {
      if (!showing) return;
      showing = false;
      screen.diffuseTexture = texture;
    },
    update(t: number) {
      if (!showing) screen.emissiveColor.setAll(0.92 + Math.sin(t * 2) * 0.06);
    },
    dispose() {
      portrait.dispose();
      texture.dispose();
    },
  };
}

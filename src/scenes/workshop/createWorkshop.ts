import { documentTable as table } from './practiceLayout';
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";

export function createWorkshop(scene: Scene, shadows: ShadowGenerator) {
  const material = (name: string, hex: string) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor.setAll(0.08);
    return m;
  };
  const plaster = material("warm plaster", "#dbd9c9"),
    trim = material("pale trim", "#eee9d9");
  const teal = material("painted steel", "#397c7a"),
    dark = material("dark steel", "#304b56");
  const wood = material("birch wood", "#b88c61");
  const ochre = material("safety yellow", "#d3ac5b"),
    mint = material("mint equipment", "#8eb6a4");
  const clay = material("terracotta", "#b87b5e");
  const texture = new DynamicTexture("fine wood grain", 256, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = "#b88c61";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = i % 3 === 0 ? "#c59b70" : "#ac8058";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(i * 3.7, 0);
    ctx.bezierCurveTo(i * 3.7 + 8, 80, i * 3.7 - 5, 160, i * 3.7, 256);
    ctx.stroke();
  }
  texture.update();
  wood.diffuseTexture = texture;
  wood.diffuseColor = Color3.White();
  const box = (
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: StandardMaterial,
  ) => {
    const mesh = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      scene,
    );
    mesh.position.set(x, y, z);
    mesh.material = m;
    mesh.receiveShadows = true;
    if (m.alpha === 1 && name !== "floor tile" && name !== "foundation") shadows.addShadowCaster(mesh);
    return mesh;
  };
  const cyl = (
    name: string,
    x: number,
    y: number,
    z: number,
    diameter: number,
    height: number,
    m: StandardMaterial,
  ) => {
    const mesh = MeshBuilder.CreateCylinder(
      name,
      { diameter, height, tessellation: 16 },
      scene,
    );
    mesh.position.set(x, y, z);
    mesh.material = m;
    mesh.receiveShadows = true;
    if (m.alpha === 1 && name !== "floor tile" && name !== "foundation") shadows.addShadowCaster(mesh);
    return mesh;
  };
  box("foundation", 0, -0.18, -3.7, 10.5, 0.35, 16.2, dark);
  for (let x = 0; x < 10; x++)
    for (let z = 0; z < 16; z++)
      box(
        "floor tile",
        -4.5 + x,
        0.006,
        -11.2 + z,
        0.985,
        0.025,
        0.985,
        z < 11 ? mint : plaster,
      );
  box("back wall", 0, 1.7, -11.75, 10.5, 3.4, 0.16, plaster);
  box("left wall", -5.15, 1.7, -3.7, 0.16, 3.4, 16.1, plaster);
  box("wall base", 0, 0.14, -11.63, 10.2, 0.25, 0.07, trim);
  box("left base", -5.04, 0.14, -3.7, 0.07, 0.25, 16, trim);
  box("back color band", 0, 0.7, -11.64, 10.2, 1, 0.04, teal);
  for (const x of [-3.6, 0, 3.6]) {
    box("window frame", x, 2.35, -11.63, 2.55, 1.4, 0.09, trim);
    box(
      "blue window",
      x,
      2.35,
      -11.56,
      2.38,
      1.23,
      0.025,
      material("sky " + x, "#91b7bf"),
    );
    box("window mullion", x, 2.35, -11.52, 0.05, 1.25, 0.06, trim);
  }
  // Lower partition and clear panes leave the workshop readable from the preparation room.
  box("partition base", -1.35, 0.43, -0.65, 7.5, 0.86, 0.12, teal);
  const glass = material("glass", "#b1dbd2");
  glass.alpha = 0.13;
  glass.backFaceCulling = false;
  glass.disableLighting = true;
  glass.emissiveColor = Color3.FromHexString("#a0ccc5");
  const partitionLeft = -5.1, bayWidth = 1.875;
  for (let i = 0; i < 4; i++) {
    const x = partitionLeft + bayWidth * (i + 0.5);
    box("glass pane", x, 1.8, -0.65, bayWidth - 0.055, 1.8, 0.035, glass);
    box("partition upright", partitionLeft + bayWidth * i, 1.78, -0.65, 0.055, 1.85, 0.09, dark);
  }
  box("partition lintel", -1.35, 2.73, -0.65, 7.5, 0.075, 0.12, dark);
  box("partition sill", -1.35, 0.9, -0.65, 7.5, 0.07, 0.15, trim);
  box("door right jamb", 4.5, 1.4, -0.65, 0.12, 2.8, 0.15, teal);
  box("door left jamb", 2.4, 1.4, -0.65, 0.12, 2.8, 0.15, teal);
  box("door header", 3.45, 2.77, -0.65, 2.2, 0.12, 0.15, teal);
  box("entrance side return", 4.85, 1.4, -0.65, 0.6, 2.8, 0.15, plaster);
  // Workshop furniture is loaded from the same CC0 pack as the machines.
  for (let level = 0; level < 2; level++)
    for (let col = 0; col < 2; col++) {
      const x = 3.1 + col * 0.7,
        y = 0.5085 + level * 0.62;
      box("storage crate", x, y, -10.5, 0.65, 0.62, 0.8, wood);
      box("crate band", x, y, -10.09, 0.12, 0.62, 0.025, ochre);
    }
  box("pallet", 3.45, 0.1085, -10.5, 1.5, 0.18, 1.05, dark);
  // Open storage entrance: a second room visible beyond the work area.
  box("storage partition", -1.6, 1.35, -6.6, 7.1, 2.7, 0.16, plaster);
  box("storage base band", -1.6, 0.55, -6.49, 7.1, 1.05, 0.05, teal);
  for (const x of [2.05, 4.65])
    box("storage doorway jamb", x, 1.4, -6.6, 0.13, 2.8, 0.24, teal);
  box("storage doorway header", 3.35, 2.78, -6.6, 2.73, 0.14, 0.24, teal);
  box("storage entrance return", 4.94, 1.35, -6.6, 0.45, 2.7, 0.16, plaster);
  // Low open shelving retains sight lines into the stockroom.
  for (const x of [-3.8, -1.1, 1.6]) {
    for (const dx of [-0.95, 0.95])
      box("storage rack upright", x + dx, 1.05, -10.7, 0.09, 2.1, 0.65, dark);
    for (const y of [0.15, 0.85, 1.55]) {
      box("storage rack shelf", x, y, -10.7, 2, 0.08, 0.75, wood);
      for (const dx of [-0.5, 0.5]) {
        box("stock carton", x + dx, y + 0.27, -10.7, 0.65, 0.46, 0.56, mint);
        box("carton tape", x + dx, y + 0.505, -10.7, 0.12, 0.012, 0.56, trim);
      }
    }
  }
  // A clear aisle connects preparation, workstations and the stockroom.
  for (const x of [2.8, 4.35])
    box("aisle edge", x, 0.026, -4.05, 0.045, 0.012, 5.0, ochre);
  // Back edge sits against the glazed partition, clear of the doorway.
  box("preparation table top", table.x, 0.97, table.z, table.width, 0.12, table.depth, wood);
  for (const x of [table.x - 1.1, table.x + 1.1])
    for (const z of [table.z - .58, table.z + .58])
      box("table leg", x, 0.465, z, 0.085, 0.93, 0.085, dark);
  box("table drawer", table.x + .8, .76, table.z, .55, .32, 1.15, teal);
  box("drawer pull", table.x + .8, .78, table.z + .59, .26, .035, .03, trim);
  box("paper stack", table.x + .55, 1.0475, table.z + .05, .46, .035, .32, trim);
  cyl("cup", table.x + .88, 1.155, table.z - .41, .16, .25, clay);
  cyl("cup interior", table.x + .88, 1.281, table.z - .41, .125, .003, dark);
  box("wall bench", -4.65, 0.46, 2.15, 0.65, 0.12, 2.2, wood);
  for (const z of [1.3, 3])
    box("bench supports", -4.65, 0.2, z, 0.55, 0.4, 0.12, dark);
  cyl("plant pot", -4.2, 0.28, 3.6, 0.5, 0.5, clay);
  for (let i = 0; i < 7; i++) {
    const leaf = MeshBuilder.CreateSphere(
      "plant leaf",
      { diameter: 0.45, segments: 8 },
      scene,
    );
    leaf.scaling.set(0.5, 1.4, 0.65);
    leaf.position.set(
      -4.2 + Math.sin(i * 2.4) * 0.2,
      0.8 + (i % 3) * 0.12,
      3.6 + Math.cos(i * 2.4) * 0.2,
    );
    leaf.rotation.z = Math.sin(i) * 0.45;
    leaf.material = mint;
    leaf.receiveShadows = true;
    shadows.addShadowCaster(leaf);
  }
  return { tabletPosition: new Vector3(table.x, 1.043, table.z) };
}

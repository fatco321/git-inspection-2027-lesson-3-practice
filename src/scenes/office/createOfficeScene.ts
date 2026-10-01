import { createPrinter } from './createPrinter';
import { cabinet, bookcasePlacement, filingFolder } from './officeLayout';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

function material(scene: Scene, name: string, hex: string): StandardMaterial {
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = Color3.FromHexString(hex);
  value.specularColor = Color3.FromHexString('#29252b');
  return value;
}

export function createOfficeScene(engine: Engine, canvas: HTMLCanvasElement) {
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString('#b7c9ccff');
  scene.ambientColor = Color3.FromHexString('#a9a29a');

  const camera = new ArcRotateCamera('office-camera', 0.92, 1.12, 10.7, new Vector3(0, 1.2, -0.25), scene);
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 16;
  camera.lowerBetaLimit = 0.65;
  camera.upperBetaLimit = 1.42;
  camera.lowerAlphaLimit = 0.08;
  camera.upperAlphaLimit = Math.PI / 2 - 0.08;
  camera.minZ = 0.05;
  camera.panningSensibility = 0;
  camera.wheelDeltaPercentage = 0.015;
  // Arrow keys belong to character movement, including after control reattachment.
  camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
  // Return cutscene keeps camera and movement locked.
  void canvas;
  camera.storeState();

  const ambient = new HemisphericLight('soft-ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.64;
  ambient.groundColor = Color3.FromHexString('#81766e');

  const sun = new DirectionalLight('window-light', new Vector3(-0.7, -1.2, 0.7), scene);
  sun.position = new Vector3(2.5, 7, -4);
  sun.intensity = 0.78;
  sun.diffuse = Color3.FromHexString('#fff3dc');
  const shadows = new ShadowGenerator(2048, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.0001;
  shadows.normalBias = 0.015;
  shadows.setDarkness(0.25);

  const monitorLight = new PointLight('monitor-light', new Vector3(0.35, 1.1, -0.65), scene);
  monitorLight.diffuse = Color3.FromHexString('#61c5d2');
  monitorLight.intensity = 0.16;
  monitorLight.range = 3.4;

  const floorMat = material(scene, 'warm-oak', '#a8866e');
  const wallMat = material(scene, 'paper-wall', '#e1d8ca');
  const wallSideMat = material(scene, 'side-wall', '#d4c9bb');
  const trimMat = material(scene, 'painted-trim', '#f5ecdf');
  const tealMat = material(scene, 'teal-accent', '#548d91');
  const darkMat = material(scene, 'dark-wood', '#6f5b52');
  const rugMat = material(scene, 'rug', '#779ca3');

  const box = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number, mat: StandardMaterial, shadow = false): AbstractMesh => {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
    mesh.position.set(x, y, z);
    mesh.material = mat;
    mesh.receiveShadows = shadow;
    return mesh;
  };

  box('floor', 8, 0.26, 6.4, 0, -0.13, 0, floorMat, true);
  box('back-wall', 8, 4.3, 0.18, 0, 2.15, -3.2, wallMat, true);
  box('left-wall', 0.18, 4.3, 6.4, -4, 2.15, 0, wallSideMat, true);
  box('back-baseboard', 8, 0.18, 0.08, 0, 0.12, -3.07, trimMat, true);
  box('left-baseboard', 0.08, 0.18, 6.2, -3.88, 0.12, 0, trimMat, true);
  box('rug', 4.5, 0.018, 2.9, 0.2, 0.023, 0.8, rugMat, true);
  box('rug-edge', 4.8, 0.012, 3.15, 0.2, 0.008, 0.8, trimMat, true);

  // Graphic window: the real light is a directional lamp, so the scene stays self-contained.
  const skyMat = material(scene, 'sky', '#a6c9d0');
  skyMat.disableLighting = true;
  skyMat.emissiveColor = Color3.FromHexString('#a6c9d0');
  box('window-sky', 2.5, 1.75, 0.04, 1.75, 2.55, -3.07, skyMat);
  box('window-top', 2.55, 0.11, 0.12, 1.75, 3.43, -2.99, trimMat);
  box('window-bottom', 2.55, 0.11, 0.12, 1.75, 1.67, -2.99, trimMat);
  box('window-left', 0.11, 1.8, 0.12, 0.48, 2.55, -2.99, trimMat);
  box('window-right', 0.11, 1.8, 0.12, 3.02, 2.55, -2.99, trimMat);
  box('window-divider-v', 0.08, 1.68, 0.12, 1.75, 2.55, -2.97, trimMat);
  box('window-divider-h', 2.5, 0.08, 0.12, 1.75, 2.56, -2.97, trimMat);

  // A wall board and a few blocks of paperwork establish the safety-office context.
  box('notice-board-frame', 0.09, 1.42, 1.95, -3.85, 2.22, -1.35, darkMat);
  box('notice-board', 0.025, 1.22, 1.76, -3.795, 2.22, -1.35, tealMat);
  const paperMat = material(scene, 'paper', '#f7f3e9');
  const paperBlueMat = material(scene, 'paper-blue', '#dce9e7');
  for (const [i, y] of [2.62, 2.24, 1.86].entries()) {
    box(`board-sheet-${i}`, 0.006, 0.28, 0.38, -3.776, y, -1.77 + i * 0.4, i === 1 ? paperBlueMat : paperMat);
  }

  const cabinetZ = cabinet.z;
  const cabinetMesh = box('side-cabinet', cabinet.width, cabinet.height, cabinet.depth, cabinet.x, cabinet.height / 2, cabinetZ, darkMat, true);
  shadows.addShadowCaster(cabinetMesh);
  for (const [index, height] of [0.59, 0.29].entries()) {
    const handle = box(`cabinet-drawer-${index}`, 0.8, 0.07, 0.07, cabinet.x, height, cabinetZ + cabinet.depth / 2 + 0.04, trimMat, true);
    shadows.addShadowCaster(handle);
  }

  createPrinter(scene, shadows, new Vector3(cabinet.x, cabinet.height, cabinet.z));

  const folderMaterials = ['#397981', '#536c83', '#ad7059', '#718977'].map((color, index) => material(scene, `folder-cover-${index}`, color));
  const folderPaper = material(scene, 'folder-paper', '#e6e0cd');
  // Top surfaces of the three shelves in Kenney's 0.85 m source model, scaled to 2.35 m.
  const shelfTops = [0.13, 0.37, 0.61].map((height) => bookcasePlacement.y + height * bookcasePlacement.height / 0.85);
  shelfTops.forEach((shelfY, row) => {
    for (let column = 0; column < 7; column++) {
      const x = bookcasePlacement.x + (column - 3) * 0.119;
      const height = 0.47 + ((row + column) % 3) * 0.012;
      const y = shelfY + height / 2;
      const z = bookcasePlacement.z + 0.04;
      const cover = folderMaterials[(column + row) % folderMaterials.length];
      const name = `folder-${row}-${column}`;
      const receivesSheet = row === filingFolder.row && column === filingFolder.column;
      const facing = receivesSheet ? -1 : 1;
      const parts = [
        box(`${name}-spine`, 0.104, height, 0.018, x, y, z + facing * 0.191, cover, true),
        box(`${name}-left-cover`, 0.008, height, 0.4, x - 0.048, y, z, cover, true),
        box(`${name}-right-cover`, 0.008, height, 0.4, x + 0.048, y, z, cover, true),
        box(`${name}-documents`, receivesSheet ? 0.079 : 0.087, height - 0.018, 0.371, x, y, z - 0.006, folderPaper, true),
        box(`${name}-blank-label`, 0.062, 0.14, 0.003, x, y + 0.045, z + facing * 0.202, paperMat, true),
      ];
      for (const part of parts) shadows.addShadowCaster(part);
    }
  });

  return { scene, camera, shadows };
}

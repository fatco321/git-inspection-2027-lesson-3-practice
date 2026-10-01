import type { ModelPlacement } from '../../assets/ModelLoader';

// World units are metres; Y is up. Related props share these anchors.
export const cabinet = { x: 2.75, z: -2.72, width: 1.05, height: 0.8, depth: 0.6 };
export const bookcasePlacement: ModelPlacement = { x: -2.7, y: 0, z: -2.58, height: 2.35, rotation: Math.PI };
export const heroPlacement: ModelPlacement = { x: 0.4, y: 0, z: 0.18, height: 1.8, rotation: Math.PI };
export const seatedPose = {
  centerX: heroPlacement.x,
  pelvisY: 0.52, pelvisZ: heroPlacement.z,
  ankleY: 0.035, ankleZ: -0.24, ankleSpread: 0.14,
  wristY: 0.89, wristZ: -0.23, wristSpread: 0.12,
};

type Furniture = 'desk' | 'chairDesk' | 'computerScreen' | 'computerKeyboard' | 'computerMouse' | 'bookcaseClosed' | 'books' | 'lampSquareTable';

export const furniturePlacements: Array<[Furniture, ModelPlacement]> = [
  ['desk', { x: 0.4, y: 0, z: -0.65, height: 0.82, rotation: Math.PI }],
  ['chairDesk', { x: 0.4, y: 0.032, z: 0.29, height: 1.1 }],
  ['computerScreen', { x: 0.35, y: 0.82, z: -0.83, height: 0.48, rotation: Math.PI }],
  ['computerKeyboard', { x: 0.4, y: 0.82, z: -0.37, height: 0.046, rotation: Math.PI }],
  ['computerMouse', { x: -0.04, y: 0.82, z: -0.36, height: 0.035, rotation: Math.PI }],
  ['bookcaseClosed', bookcasePlacement],
  ['books', { x: 0.96, y: 0.82, z: -0.84, height: 0.16 }],
  ['lampSquareTable', { x: -0.2, y: 0.82, z: -0.84, height: 0.36 }],
];


// Open edge faces the room; a narrow gap beside the stack receives the new sheet.
export const filingFolder = {
  row: 1, column: 1,
  x: bookcasePlacement.x - 2 * 0.119,
  y: bookcasePlacement.y + 0.37 * bookcasePlacement.height / 0.85,
  z: bookcasePlacement.z + 0.04,
  slotOffset: 0.0415,
};

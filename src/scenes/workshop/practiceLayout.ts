export const guideMeeting = {x:1.1,z:2.3};
export const workshopFurniture = [
 {file:'workbench-vice',x:-2.3,z:-5.64,height:1.12},
 {file:'tool-pegboard',x:-2.3,z:-6.17,height:1.9,widthScale:1.12},
 {file:'parts-shelving',x:.95,z:-6.15,height:2.053},
] as const;
export const machines = [
 {id:'m204',title:'ПР-204',file:'bench-lathe',x:-4.58,z:-2.15,height:1.49,labelY:.69},
 {id:'m208',title:'ПР-208',file:'pillar-drill',x:-4.59,z:-4.25,height:2.16,labelY:1.77},
] as const;
export const documentTable = { x: -1.7, z: .16, width: 2.5, depth: 1.42, interactionZ: 1.4 };
export const obstacles = [
 {x0:documentTable.x-1.5,x1:documentTable.x+1.5,z0:documentTable.z-.9,z1:documentTable.z+.92}, // preparation table and clearance
 {x0:-3.57,x1:-1.03,z0:-6.52,z1:-4.94}, // workbench
 {x0:-5,x1:-3.92,z0:-3.04,z1:-1.26}, // PR-204
 {x0:-5,x1:-3.92,z0:-4.9,z1:-3.6}, // PR-208
 {x0:0.08,x1:1.82,z0:-6.5,z1:-5.62}, // supplies cabinet
 {x0:-5,x1:2.7,z0:-11.4,z1:-10.0}, // stock racks
 {x0:2.55,x1:4.45,z0:-11.3,z1:-9.7}, // pallet
 {x0:-5,x1:-4.1,z0:0.9,z1:3.55},
 {x0:-4.65,x1:-3.7,z0:3.1,z1:4.25},
];
export function canStand(x:number,z:number) {
 if(x < -4.8||x>4.85||z < -11.35||z>4.1)return false;
 if(Math.abs(z+0.65)<0.3&&(x<2.7||x>4.2))return false;
 if(Math.abs(z+6.6)<0.32&&(x<2.4||x>4.3))return false;
 return !obstacles.some(b=>x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1);
}

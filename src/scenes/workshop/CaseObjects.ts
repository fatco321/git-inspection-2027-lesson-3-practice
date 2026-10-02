import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { documentTable as table, machines, workshopFurniture } from './practiceLayout';
import type { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { ModelLoader } from '../../assets/ModelLoader';
import type { SubjectId } from '../../practice/PracticeState';
export type InspectionObject={id:SubjectId;title:string;point:Vector3;label:Vector3;labelRight?:Vector3;labelWidth?:number;labelHeight?:number;root?:TransformNode};
export async function createCaseObjects(scene:Scene,loader:ModelLoader,shadows:ShadowGenerator) {
 const objects:InspectionObject[]=[];
 const plaque=(text:string,position:Vector3,width=.7,height=.24,rotation=Math.PI)=>{
  const texture=new DynamicTexture('plate '+text,{width:512,height:192},scene,false);
  const ctx=texture.getContext() as CanvasRenderingContext2D;ctx.fillStyle='#f1e9cb';ctx.fillRect(0,0,512,192);ctx.strokeStyle='#35585f';ctx.lineWidth=12;ctx.strokeRect(6,6,500,180);ctx.textAlign='center';ctx.fillStyle='#153c49';ctx.font='bold 70px sans-serif';ctx.fillText(text,256,122);texture.update();
  const mat=new StandardMaterial('plate '+text,scene);mat.diffuseTexture=texture;mat.emissiveColor.setAll(.08);mat.specularColor.setAll(0);mat.backFaceCulling=false;
  const mesh=MeshBuilder.CreatePlane('label '+text,{width,height},scene);mesh.position.copyFrom(position);mesh.rotation.y=rotation;mesh.material=mat;mesh.isPickable=false;mesh.receiveShadows=true;
 };
 for(const machine of machines){
  const {id,title,x,z,height,labelY,file}=machine;
  const model=await loader.load('machine-shop/'+file+'.glb',{x,y:.025,z,height,rotation:Math.PI/2},id);if(!model)return objects;
  const root=scene.getTransformNodeByName(id+'-pivot')!;
  let front=-Infinity;for(const m of root.getChildMeshes()){if(!m.getTotalVertices())continue;m.computeWorldMatrix(true);front=Math.max(front,m.getBoundingInfo().boundingBox.maximumWorld.x);m.metadata={subject:id};}
  const labelWidth=.42,labelHeight=.145;
  const label=new Vector3(front+.025,labelY,z);plaque(title,label,labelWidth,labelHeight,Math.PI*1.5);
  objects.push({id,title,point:new Vector3(x,height*.5,z),label,labelRight:new Vector3(0,0,-1),labelWidth,labelHeight,root});
 }
 for(const [id,title,x] of [['s1','С-1',-3.8],['s2','С-2',-1.1],['s3','С-3',1.6]] as const){
  const labelWidth=.65,labelHeight=.23;
  const label=new Vector3(x,1.9,-10.28);plaque(title,label,labelWidth,labelHeight);objects.push({id,title,point:new Vector3(x,1,-10.7),label,labelWidth,labelHeight});
 }
 // Replace plain carton placeholders with the downloaded textured crates.
 for(const m of [...scene.meshes])if(m.name==='stock carton'||m.name==='carton tape')m.dispose();
 for(const x of [-3.8,-1.1,1.6])for(const y of [.19,.89,1.59])for(const side of [-.48,.48]){
  if(scene.isDisposed)return objects;
  await loader.load('kenney-factory/box-small.glb',{x:x+side,y,z:-10.7,height:.43},`box-${x}-${y}-${side}`);
 }
 for(const item of workshopFurniture){
  if(scene.isDisposed)return objects;
  await loader.load('machine-shop/'+item.file+'.glb',{x:item.x,y:.025,z:item.z,height:item.height},item.file);
  // Keep the panel's floor supports outside the workbench's rear legs.
  if(!scene.isDisposed&&'widthScale' in item){const root=scene.getTransformNodeByName(item.file+'-pivot');if(root)root.scaling.x*=item.widthScale;}
 }
 await loader.load('kenney-factory/cone.glb',{x:4.6,y:.025,z:-5.8,height:.45},'corner-cone');
 if(scene.isDisposed)return objects;
 plaque('ДОКУМЕНТЫ',new Vector3(table.x+.3,1.07,table.z+.62),.85,.14);
 const paper=new StandardMaterial('file paper',scene);paper.diffuseColor=Color3.FromHexString('#efe4bc');
 for(let i=0;i<3;i++){const folder=MeshBuilder.CreateBox('document folder',{width:.4,height:.055,depth:.32},scene);folder.position.set(table.x-.15+i*.06,1.06+i*.056,table.z-.01);folder.material=paper;folder.receiveShadows=true;shadows.addShadowCaster(folder);}
 objects.push({id:'workshop',title:'Мастерская',point:new Vector3(0,1,-4.2),label:new Vector3(0,1,-4.2)});
 return objects;
}

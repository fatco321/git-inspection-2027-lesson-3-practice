import type {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {groundedCharacterY} from '../characters/groundCharacter';
const ease=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
/** Arrival effects are local; imported character resources belong to ModelLoader. */
export class PreparationGuide {
 private elapsed=0;
 visible=false;
 ready=false;
 private readonly meshes;
 private readonly rings;
 private readonly sparks;
 private readonly material;
 constructor(readonly root:TransformNode,model:AssetContainer){
  model.animationGroups.find(group=>group.name==='Idle_Neutral')?.start(true);
  root.position.y=groundedCharacterY(model,root,.025);
  this.meshes=root.getChildMeshes().map(mesh=>({mesh,visibility:mesh.visibility}));
  root.setEnabled(false);
  const scene=root.getScene();
  this.material=new StandardMaterial('guide-arrival-light',scene);
  this.material.disableLighting=true;
  this.material.emissiveColor=Color3.FromHexString('#a6e8de');
  this.rings=[0,1].map(layer=>{
   const mesh=MeshBuilder.CreateTorus(`guide-arrival-ring-${layer}`,{diameter:1.55,thickness:.025,tessellation:64},scene);
   mesh.material=this.material;mesh.isPickable=false;mesh.setEnabled(false);return mesh;
  });
  this.sparks=Array.from({length:28},(_,i)=>{
   const mesh=MeshBuilder.CreateBox(`guide-arrival-spark-${i}`,{size:.035},scene);
   mesh.material=this.material;mesh.isPickable=false;mesh.setEnabled(false);return mesh;
  });
 }
 show(){
  if(this.visible)return;
  this.visible=true;this.root.setEnabled(true);
  this.meshes.forEach(({mesh})=>mesh.visibility=0);
  [...this.rings,...this.sparks].forEach(mesh=>mesh.setEnabled(true));
  this.animateArrival();
 }
 private animateArrival(){
  const t=this.elapsed;
  const assemble=ease((t-.35)/1.8);
  const glow=ease(t/.3)*(1-ease((t-2.05)/.7));
  this.meshes.forEach(({mesh,visibility})=>mesh.visibility=visibility*assemble);
  this.rings.forEach((mesh,i)=>{
   mesh.position.set(this.root.position.x,i===0?.035:2.05-assemble*2,this.root.position.z);
   mesh.scaling.setAll(i===0?.8+.2*ease(t/.5):1-.25*assemble);
   mesh.visibility=glow*(i===0?.65:1);
  });
  this.sparks.forEach((mesh,i)=>{
   const angle=i*2.399+t*.65;
   const radius=.85*(1-assemble)+.2;
   mesh.position.set(this.root.position.x+Math.cos(angle)*radius,.15+(i%11)/11*1.85+(1-assemble)*.4,this.root.position.z+Math.sin(angle)*radius);
   mesh.rotation.set(t+i,t*.5,i);
   mesh.visibility=glow*(1-ease((t-1.8)/.5));
  });
  if(t>=2.75){
   this.ready=true;
   [...this.rings,...this.sparks].forEach(mesh=>mesh.setEnabled(false));
  }
 }
 update(dt:number,hero:TransformNode){
  if(!this.visible)return;
  if(!this.ready){this.elapsed+=dt;this.animateArrival();}
  const angle=Math.atan2(hero.position.x-this.root.position.x,hero.position.z-this.root.position.z);
  this.root.rotation.y+=Math.atan2(Math.sin(angle-this.root.rotation.y),Math.cos(angle-this.root.rotation.y))*Math.min(1,dt*4);
 }
 dispose(){
  [...this.rings,...this.sparks].forEach(mesh=>mesh.dispose());this.material.dispose();
 }
}

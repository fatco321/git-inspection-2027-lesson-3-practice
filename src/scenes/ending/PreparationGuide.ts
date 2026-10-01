import type {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import {groundedCharacterY} from '../characters/groundCharacter';
/** Guide waits in the preparation room; imported resources belong to ModelLoader. */
export class PreparationGuide {
 private elapsed=0;
 visible=false;
 private readonly meshes;
 constructor(readonly root:TransformNode,model:AssetContainer){
  model.animationGroups.find(group=>group.name==='Idle_Neutral')?.start(true);
  root.position.y=groundedCharacterY(model,root,.025);
  this.meshes=root.getChildMeshes().map(mesh=>({mesh,visibility:mesh.visibility}));
  root.setEnabled(false);
 }
 show(){if(this.visible)return;this.visible=true;this.root.setEnabled(true);this.meshes.forEach(({mesh})=>mesh.visibility=0);}
 update(dt:number,hero:TransformNode){
  if(!this.visible)return;
  this.elapsed+=dt;const fade=Math.min(1,this.elapsed/.8);
  this.meshes.forEach(({mesh,visibility})=>mesh.visibility=visibility*fade);
  const angle=Math.atan2(hero.position.x-this.root.position.x,hero.position.z-this.root.position.z);
  this.root.rotation.y+=Math.atan2(Math.sin(angle-this.root.rotation.y),Math.cos(angle-this.root.rotation.y))*Math.min(1,dt*4);
 }
}

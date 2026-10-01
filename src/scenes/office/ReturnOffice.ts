import {OfficeGiftCutscene} from './OfficeGiftCutscene';
import type {Engine} from '@babylonjs/core/Engines/engine';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {ModelLoader} from '../../assets/ModelLoader';
import {createOfficeScene} from './createOfficeScene';
import {bookcasePlacement,furniturePlacements} from './officeLayout';
import {groundedCharacterY} from '../characters/groundCharacter';

/** Opening frame of the return cutscene. Story actions will be authored separately. */
export class ReturnOffice {
 readonly scene;
 private readonly camera;
 private readonly loader;
 private disposed=false;
 private cutscene?:OfficeGiftCutscene;
 private readonly shadows;
 readonly ready:Promise<void>;
 constructor(engine:Engine,canvas:HTMLCanvasElement){
  const room=createOfficeScene(engine,canvas);this.scene=room.scene;this.camera=room.camera;
  this.loader=new ModelLoader(this.scene,room.shadows);this.shadows=room.shadows;
  this.camera.setTarget(new Vector3(-.5,1.2,-.65));this.camera.radius=10.2;
  this.ready=this.load();this.resize();
 }
 private async load(){
  const results=await Promise.allSettled([
   ...furniturePlacements.map(async([name,placement])=>{
    // The chair stays where the hero left it when standing up in lesson one.
    const at=name==='chairDesk'?{...placement,z:.95}:placement;
    const model=await this.loader.load(`return-office/${name}.obj`,at,name);
    if(name==='computerScreen')for(const material of model?.materials??[]){
     if(material instanceof StandardMaterial&&material.name==='metal'){
      material.diffuseColor=Color3.FromHexString('#366775');material.emissiveColor=Color3.FromHexString('#16313a');
     }
    }
   }),
   this.loader.load('quaternius/worker.gltf',{x:bookcasePlacement.x,y:0,z:bookcasePlacement.z+.48,height:1.8,rotation:Math.PI},'return-hero').then(model=>{
    if(!model||this.disposed)return;
    model.animationGroups.find(group=>group.name==='Idle_Neutral')?.start(true);
    const root=this.scene.getTransformNodeByName('return-hero-pivot')!;
    root.position.y=groundedCharacterY(model,root);
    this.cutscene=new OfficeGiftCutscene(this.scene,this.camera,root,model,this.shadows);
   }),
  ]);
  if(this.disposed)return;
  const errors=results.filter((result):result is PromiseRejectedResult=>result.status==='rejected');
  if(errors.length)throw new AggregateError(errors.map(result=>result.reason),'Не удалось загрузить кабинет');
  await this.scene.whenReadyAsync();
 }
 resize(){const engine=this.scene.getEngine();const aspect=engine.getRenderWidth()/Math.max(1,engine.getRenderHeight());this.camera.fov=2*Math.atan(Math.tan(.4)*Math.max(1,1/aspect));}
 render(){if(!this.disposed){this.cutscene?.update(Math.min(.05,this.scene.getEngine().getDeltaTime()/1000));this.scene.render();}}
 dispose(){if(this.disposed)return;this.disposed=true;this.cutscene?.dispose();this.loader.dispose();this.scene.dispose();}
}

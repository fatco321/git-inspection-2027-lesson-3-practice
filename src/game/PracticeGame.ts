import {ReturnOffice} from '../scenes/office/ReturnOffice';
import {PreparationGuide} from '../scenes/ending/PreparationGuide';
import { documentTable, guideMeeting, canStand } from '../scenes/workshop/practiceLayout';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { ModelLoader } from '../assets/ModelLoader';
import { createWorkshop } from '../scenes/workshop/createWorkshop';
import { createCaseObjects, type InspectionObject } from '../scenes/workshop/CaseObjects';
import { InspectionCamera } from '../scenes/workshop/InspectionCamera';
import { PracticeWalk } from '../scenes/digital/PracticeWalk';
import { PracticeEnding } from '../scenes/ending/PracticeEnding';
import { PracticeFlow } from '../practice/PracticeFlow';
import { createTablet } from '../scenes/workshop/createTablet';
import { TabletPose } from '../scenes/characters/TabletPose';
export class PracticeGame {
 private readonly engine:Engine;private readonly scene:Scene;private readonly camera:ArcRotateCamera;private readonly loader:ModelLoader;private readonly flow:PracticeFlow;
 private tablet:ReturnType<typeof createTablet>;private tabletPose?:TabletPose;private tabletBlend=0;
 private shadows:ShadowGenerator;
 private hero?:TransformNode;private walk?:PracticeWalk;private lens?:InspectionCamera;private ending?:PracticeEnding;private objects:InspectionObject[]=[];
 private returnOffice?:ReturnOffice;
 private officeActive=false;
 private guide?:PreparationGuide;
 private capturing=false;private disposed=false;private canMove=false;private nearest='';
 readonly ready:Promise<void>;
 constructor(private canvas:HTMLCanvasElement){
  this.engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true});this.engine.setHardwareScalingLevel(Math.max(1,window.devicePixelRatio/1.5));
  this.scene=new Scene(this.engine);this.scene.clearColor=Color4.FromHexString('#283e47ff');this.scene.ambientColor=Color3.FromHexString('#617275');
  this.camera=new ArcRotateCamera('practice orbit',1.13,.95,8.5,new Vector3(0,.8,2.7),this.scene);this.camera.minZ=.08;this.camera.lowerRadiusLimit=5;this.camera.upperRadiusLimit=12;this.camera.lowerBetaLimit=.55;this.camera.upperBetaLimit=1.2;this.camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');this.camera.wheelPrecision=35;this.fitCamera();
  const sky=new HemisphericLight('daylight',Vector3.Up(),this.scene);sky.intensity=.72;sky.groundColor=Color3.FromHexString('#8b9a9a');
  const sun=new DirectionalLight('sun',new Vector3(-.7,-1,.5),this.scene);sun.position.set(10.5,16,-11.2);sun.intensity=.85;sun.diffuse=Color3.FromHexString('#fff1d7');
  // A fixed volume covers all three rooms and is independent of the active camera.
  sun.shadowFrustumSize=24;sun.shadowMinZ=.1;sun.shadowMaxZ=40;
  const shadows=new ShadowGenerator(2048,sun);shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=ShadowGenerator.QUALITY_HIGH;shadows.bias=.0003;shadows.normalBias=.015;
  // Cutaway walls remain solid light blockers when faded for the orbit camera.
  // Glass is never registered as a caster.
  shadows.transparencyShadow=true;this.shadows=shadows;
  this.tablet=createTablet(this.scene,Vector3.Zero(),shadows);this.tablet.root.scaling.setAll(.48);this.tablet.root.setEnabled(false);
  createWorkshop(this.scene,shadows);this.loader=new ModelLoader(this.scene,shadows);
  this.flow=new PracticeFlow(enabled=>this.controls(enabled),()=>this.openCamera(),()=>this.finish(),()=>this.guide?.show());
  window.addEventListener('resize',this.resize);window.addEventListener('keydown',this.key);this.engine.runRenderLoop(this.render);this.ready=this.load();
 }
 private async load(){
  try {
   const model=await this.loader.load('quaternius/worker.gltf',{x:0,y:.025,z:2.7,height:1.72,rotation:Math.PI},'hero');if(!model||this.disposed)return;
   this.hero=this.scene.getTransformNodeByName('hero-pivot')!;this.walk=new PracticeWalk(this.hero,model,this.camera);this.tabletPose=new TabletPose(this.scene,model,this.hero,this.tablet.root);
   this.objects=await createCaseObjects(this.scene,this.loader,this.shadows);if(this.disposed)return;
   const guideModel=await this.loader.load('guide/andrey.glb',{x:guideMeeting.x,y:.025,z:guideMeeting.z,height:1.78},'preparation-guide');
   if(this.disposed||!guideModel)return;
   this.guide=new PreparationGuide(this.scene.getTransformNodeByName('preparation-guide-pivot')!,guideModel);
   this.walk?.setIndoor(false,(x,z)=>canStand(x,z)&&(!this.guide?.visible||Math.hypot(x-guideMeeting.x,z-guideMeeting.z)>.58));
   this.lens=new InspectionCamera(this.scene,this.canvas,this.camera,this.hero,this.objects);
   await this.scene.whenReadyAsync();if(this.disposed)return;
   this.flow.ready();
  }catch(error){if(!this.disposed){this.dispose();throw error;}}
 }
 private controls(enabled:boolean){
  this.canMove=enabled&&!this.capturing&&!this.lens?.active&&!this.ending;
  this.walk?.setEnabled(this.canMove);
  if(this.canMove){this.camera.attachControl(this.canvas,false);this.canvas.focus({preventScroll:true});}else this.camera.detachControl();
 }
 private key=(e:KeyboardEvent)=>{
  if(e.code!=='Enter'||e.repeat||!this.canMove)return;
  if(e.target instanceof HTMLElement&&['BUTTON','INPUT','TEXTAREA','A'].includes(e.target.tagName))return;
  e.preventDefault();if(this.nearest==='guide'){if(this.hero){this.hero.rotation.y=Math.atan2(guideMeeting.x-this.hero.position.x,guideMeeting.z-this.hero.position.z);}this.flow.meetGuide();return;}if(this.nearest==='documents')this.flow.archive();else if(this.nearest){const object=this.objects.find(o=>o.id===this.nearest)!;this.flow.ui.show(object.title,'Маркировка на объекте: '+object.title+'.\nСопоставьте её с запросом инспектора и выбранным документом.',[
   ...(this.flow.state.phase!=='prepare'?[{label:'Открыть запросы',run:()=>this.flow.requests()}]:[]),{label:'Назад',secondary:true,run:()=>this.flow.ui.close()},
  ]);}
 };
 private openCamera(){if(!this.flow.checkConnection(true))return;if(!this.lens||this.lens.active||this.capturing)return;this.controls(false);this.lens.start();this.flow.ui.setCue('');this.flow.ui.cameraMode('Камера',()=>this.shoot(),()=>this.closeCamera());}
 private closeCamera(){this.lens?.stop();this.flow.ui.hideCamera();this.controls(true);}
 private async shoot(){
  if(!this.lens?.active||this.capturing)return;this.capturing=true;const photo=this.lens.capture();
  this.scene.render();const preview=document.createElement('canvas');preview.width=Math.min(960,this.canvas.width);preview.height=Math.round(preview.width*this.canvas.height/this.canvas.width);preview.getContext('2d')!.drawImage(this.canvas,0,0,preview.width,preview.height);
  const image=preview.toDataURL('image/jpeg',.65);
  this.flow.state.capturePhoto({...photo,image,sent:false});
  this.lens.stop();this.controls(false);
  const finished=await this.flow.ui.flyPhoto(image);
  this.capturing=false;
  if(this.disposed||!finished)return;
  this.flow.ui.hideCamera();this.flow.menu();
 }
 private finish(){if(!this.hero||this.ending)return;this.controls(false);this.ending=new PracticeEnding(this.scene,[this.hero],()=>{void this.arriveHome();});}
 private async arriveHome(){
  if(this.disposed||this.returnOffice)return;
  const room=new ReturnOffice(this.engine,this.canvas);this.returnOffice=room;
  try{
   await room.ready;if(this.disposed)return;
   this.officeActive=true;room.resize();room.render();this.ending?.revealDestination();
  }catch(error){
   if(this.disposed)return;
   console.error(error);room.dispose();this.returnOffice=undefined;
   this.ending?.revealDestination();
   this.flow.ui.show('Не удалось загрузить кабинет','Попробуйте ещё раз.',[{label:'Повторить',run:()=>{this.flow.ui.hideAll();void this.arriveHome();}}]);
  }
 }
 private render=()=>{
  if(this.disposed||document.hidden)return;
  if(this.officeActive){this.returnOffice?.render();return;}
  const dt=Math.min(.05,this.engine.getDeltaTime()/1000);this.walk?.update(dt);this.ending?.update(dt);if(this.hero)this.guide?.update(dt,this.hero);this.updateTablet(dt);
  if(this.hero&&!this.lens?.active){
   // Only fade enclosing walls when they hide the player; props keep solid silhouettes.
   const target=this.hero.position.add(new Vector3(0,1,0));const ray=new Ray(this.camera.position,target.subtract(this.camera.position).normalize(),Vector3.Distance(this.camera.position,target));
   for(const mesh of this.scene.meshes.filter(m=>['back wall','left wall','storage partition','partition base','entrance side return'].includes(m.name))){mesh.visibility=1;if(ray.intersectsMesh(mesh).hit)mesh.visibility=.13;}
  }
  if(this.canMove&&this.hero){
   const pos=this.hero.position;const documents=Vector3.Distance(new Vector3(pos.x,0,pos.z),new Vector3(documentTable.x,0,documentTable.interactionZ))<1.35;
   const near=this.objects.filter(o=>o.id!=='workshop').map(o=>({o,d:Math.hypot(pos.x-o.label.x,pos.z-o.label.z)})).filter(x=>x.d<1.8).sort((a,b)=>a.d-b.d)[0];
   const guideNear=this.guide?.ready&&this.flow.endingStage==='waiting'&&Math.hypot(pos.x-guideMeeting.x,pos.z-guideMeeting.z)<1.55;
   this.nearest=guideNear?'guide':this.flow.endingStage!=='none'?'':documents?'documents':near?.o.id??'';this.flow.ui.setCue(guideNear?'Enter — поговорить с Андреем':this.flow.endingStage!=='none'?'':documents?'Enter — документы мастерской':near?'Enter — осмотреть '+near.o.title:'');
  }else this.flow.ui.setCue('');
  this.scene.render();
 };
 private updateTablet(dt:number){
  if(!this.hero)return;
  if(this.flow.dialogue.isOpen)this.tablet.showGuide();else this.tablet.showInvitation();
  const open=this.flow.tabletOpen&&!this.lens?.active&&!this.ending;
  this.tabletBlend=Math.max(0,Math.min(1,this.tabletBlend+(open?1:-1)*dt/0.65));
  const b=this.tabletBlend,t=b*b*(3-2*b);
  this.flow.ui.setTabletReady(b>=1,this.flow.tabletOpen);
  this.flow.dialogue.setTabletReady(this.flow.endingStage==='talking'?b<=0:b>=1);
  this.tablet.root.setEnabled(b>0.001);
  const forward=new Vector3(Math.sin(this.hero.rotation.y),0,Math.cos(this.hero.rotation.y));
  this.tablet.root.position.copyFrom(this.hero.position.add(forward.scale(.16+.06*t)).add(new Vector3(0,.78+.5*t,0)));
  this.tablet.root.rotation.set(1.3-.75*t,this.hero.rotation.y,0);
  this.tabletPose?.update(t);
  const point=Vector3.Project(this.hero.position.add(new Vector3(0,1.98,0)),Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()));
  const x=point.x*this.canvas.clientWidth/this.engine.getRenderWidth(),y=point.y*this.canvas.clientHeight/this.engine.getRenderHeight();
  this.flow.ui.anchor(x,y);this.flow.dialogue.anchor(x,y);
 }
 private fitCamera(){const aspect=this.engine.getRenderWidth()/Math.max(1,this.engine.getRenderHeight());this.camera.fov=2*Math.atan(Math.tan(.4)*Math.max(1,.8/aspect));}
 private resize=()=>{this.engine.resize();this.fitCamera();this.returnOffice?.resize();};
 dispose(){if(this.disposed)return;this.disposed=true;this.engine.stopRenderLoop(this.render);window.removeEventListener('resize',this.resize);window.removeEventListener('keydown',this.key);this.returnOffice?.dispose();this.tabletPose?.dispose();this.tablet.dispose();this.lens?.dispose();this.ending?.dispose();this.walk?.dispose();this.flow.dispose();this.guide?.dispose();this.loader.dispose();this.scene.dispose();this.engine.dispose();}
}

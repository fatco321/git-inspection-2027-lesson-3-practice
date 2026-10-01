import {poseAtDesk} from './poseAtDesk';
import type {Scene} from '@babylonjs/core/scene';
import type {AssetContainer} from '@babylonjs/core/assetContainer';
import type {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera';
import type {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {Vector3,Quaternion,Matrix} from '@babylonjs/core/Maths/math.vector';
import {TabletPose} from '../characters/TabletPose';
import './officeGift.css';
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
/** Deterministic closing scene: thoughts, approach, two-handed lift, opening, letter. */
export class OfficeGiftCutscene {
 private time=0;
 private received=false;
 private closingTime=0;
 private readonly seated;
 private readonly legs;
 private readonly finale=document.createElement('section');
 private readonly nodes;
 private readonly idle;
 private readonly steps;
 private readonly gift:TransformNode;
 private readonly lid:TransformNode;
 private readonly grip:TransformNode;
 private readonly pose:TabletPose;
 private readonly thought=document.createElement('div');
 private readonly letter=document.createElement('section');
 private readonly start:Vector3;
 private readonly giftStart=new Vector3(-1.25,.15,.1);
 constructor(private scene:Scene,private camera:ArcRotateCamera,private hero:TransformNode,model:AssetContainer,shadows:ShadowGenerator){
  this.start=hero.position.clone();this.nodes=model.transformNodes;
  const capture=()=>this.nodes.map(n=>({p:n.position.clone(),q:n.rotationQuaternion?.clone()??Quaternion.FromEulerVector(n.rotation)}));
  const sample=(name:string,count:number)=>{const a=model.animationGroups.find(g=>g.name===name)!;a.start(false);a.pause();const poses=Array.from({length:count},(_,i)=>{a.goToFrame(a.from+(a.to-a.from)*i/count);return capture();});a.stop();return poses;};
  this.idle=sample('Idle_Neutral',1)[0];this.steps=sample('Walk',40);this.apply(this.idle,this.idle,0);
  const original=hero.position.clone();hero.position.set(.4,original.y,.18);hero.rotation.y=Math.PI;
  poseAtDesk(model);this.seated=capture();hero.position.copyFrom(original);this.apply(this.idle,this.idle,0);
  const joint=(name:string)=>this.nodes.find(n=>n.name===name)!;
  this.legs=['L','R'].map(side=>{const upper=joint('UpperLeg.'+side),lower=joint('LowerLeg.'+side),foot=joint('Foot.'+side);return {upper,lower,foot,a:Vector3.Distance(this.position(upper),this.position(lower)),b:Vector3.Distance(this.position(lower),this.position(foot))};});
  const mat=(name:string,color:string)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.set(.1,.1,.1);return m;};
  const teal=mat('gift-teal','#4c8f92'),gold=mat('gift-ribbon','#eac98a'),paper=mat('gift-letter','#fff4dc');
  this.gift=new TransformNode('office-gift',scene);this.gift.position.copyFrom(this.giftStart);
  const box=(name:string,w:number,h:number,d:number,parent:TransformNode,m:StandardMaterial,y=0)=>{const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.parent=parent;mesh.position.y=y;mesh.material=m;mesh.receiveShadows=true;shadows.addShadowCaster(mesh);return mesh;};
  box('gift-bottom',.5,.025,.34,this.gift,teal,-.105);
  for(const x of [-.24,.24])box('gift-side',.02,.22,.34,this.gift,teal).position.x=x;
  for(const z of [-.16,.16])box('gift-side',.5,.22,.02,this.gift,teal).position.z=z;
  box('letter-in-gift',.39,.015,.25,this.gift,paper,.02);
  this.lid=new TransformNode('gift-lid',scene);this.lid.parent=this.gift;this.lid.position.set(0,.13,-.17);
  box('gift-lid-cover',.53,.055,.37,this.lid,teal).position.z=.17;
  box('gift-ribbon-cross',.535,.008,.05,this.lid,gold,.032).position.z=.17;
  box('gift-ribbon-long',.05,.008,.375,this.lid,gold,.034).position.z=.17;
  this.grip=new TransformNode('gift-grip',scene);this.grip.scaling.setAll(.6);this.grip.rotation.x=Math.PI/2;
  this.pose=new TabletPose(scene,model,hero,this.grip);
  this.thought.className='office-thought';this.thought.hidden=true;document.body.append(this.thought);
  this.letter.className='gift-letter-overlay';this.letter.hidden=true;
  const card=document.createElement('article'),text=document.createElement('p'),signature=document.createElement('p'),download=document.createElement('a');
  text.textContent='Дорогой друг! Я рад, что теперь ты во всём разобрался: знаешь, где найти сведения о проверке, как организовать выполнение предписания и подготовиться к дистанционному осмотру. У меня для тебя подарок — инструкция по приложению «Инспектор». Если что-то забудешь или запутаешься в его работе, она поможет вспомнить нужные шаги. Пусть новые знания придают уверенности, а эта памятка всегда будет под рукой!';
  signature.textContent='Твой проводник, Андрей';signature.className='gift-signature';
  download.textContent='Получить подарок';download.href=import.meta.env.BASE_URL+'downloads/MP_inspektor.pdf';download.download='Инструкция — Инспектор.pdf';
  download.addEventListener('click',()=>{if(this.received)return;this.received=true;this.closingTime=0;this.letter.hidden=true;this.gift.setEnabled(false);this.pose.update(0);this.scene.getEngine().getRenderingCanvas()?.focus({preventScroll:true});});
  this.finale.className='office-finale';this.finale.hidden=true;this.finale.setAttribute('role','status');const finalText=document.createElement('h1');finalText.textContent='Это приключение подошло к концу';this.finale.append(finalText);document.body.append(this.finale);
  card.append(text,signature,download);this.letter.append(card);this.letter.setAttribute('role','dialog');this.letter.setAttribute('aria-label','Письмо от Андрея');document.body.append(this.letter);
 }
 private apply(a:typeof this.idle,b:typeof this.idle,t:number){this.nodes.forEach((n,i)=>{Vector3.LerpToRef(a[i].p,b[i].p,t,n.position);n.rotationQuaternion??=Quaternion.Identity();Quaternion.SlerpToRef(a[i].q,b[i].q,t,n.rotationQuaternion);});}
 private position(node:TransformNode){node.computeWorldMatrix(true);return node.getAbsolutePosition().clone();}
 private aim(node:TransformNode,target:Vector3){
  const parent=node.parent as TransformNode;parent.computeWorldMatrix(true);
  const desired=Vector3.TransformCoordinates(target,Matrix.Invert(parent.getWorldMatrix())).subtract(node.position).normalize();
  const q=node.rotationQuaternion!,m=Matrix.Identity();Matrix.FromQuaternionToRef(q,m);
  const delta=Quaternion.Identity();Quaternion.FromUnitVectorsToRef(Vector3.TransformNormal(Vector3.Up(),m).normalize(),desired,delta);
  node.rotationQuaternion=delta.multiply(q).normalize();node.computeWorldMatrix(true);
 }
 private squat(weight:number){
  if(weight<=0)return;
  const feet=this.legs.map(leg=>this.position(leg.foot));
  const body=this.nodes.find(node=>node.name==='Body')!;
  body.setAbsolutePosition(this.position(body).add(new Vector3(0,-.73*weight,.08*weight)));
  this.legs.forEach((leg,i)=>{
   const start=this.position(leg.upper),target=feet[i],direction=target.subtract(start).normalize();
   const d=Math.max(Math.abs(leg.a-leg.b)+.001,Math.min(Vector3.Distance(start,target),leg.a+leg.b-.001));
   const along=(leg.a*leg.a-leg.b*leg.b+d*d)/(2*d),pole=new Vector3(0,0,-1);
   const bend=pole.subtract(direction.scale(Vector3.Dot(pole,direction))).normalize();
   this.aim(leg.upper,start.add(direction.scale(along)).add(bend.scale(Math.sqrt(Math.max(0,leg.a*leg.a-along*along)))));
   this.aim(leg.lower,target);leg.foot.setAbsolutePosition(target);
  });
 }
 private showThought(text:string,height=2.05){
  this.thought.textContent=text;this.thought.hidden=!text;
  const engine=this.scene.getEngine(),canvas=engine.getRenderingCanvas()!;
  const point=Vector3.Project(this.hero.position.add(new Vector3(0,height,0)),Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight()));
  this.thought.style.left=Math.max(130,Math.min(canvas.clientWidth-130,point.x*canvas.clientWidth/engine.getRenderWidth()))+'px';this.thought.style.top=Math.max(30,point.y*canvas.clientHeight/engine.getRenderHeight())+'px';
 }
 private closing(dt:number){
  this.closingTime+=dt;const preview=import.meta.env.DEV?Number(new URLSearchParams(location.search).get('previewClosingTime')):0,t=preview>0?preview:this.closingTime;
  this.pose.update(0);this.gift.setEnabled(false);this.apply(this.idle,this.idle,0);
  const start=new Vector3(-1.25,this.start.y,.52),end=new Vector3(.4,this.start.y,.5);
  const u=smooth((t-.65)/2.5);Vector3.LerpToRef(start,end,u,this.hero.position);
  const walking=t>.65&&t<3.15,angle=walking?Math.PI/2:Math.PI;
  this.hero.rotation.y+=Math.atan2(Math.sin(angle-this.hero.rotation.y),Math.cos(angle-this.hero.rotation.y))*Math.min(1,dt*8);
  if(walking){const f=u*Vector3.Distance(start,end)/1.45*40;this.apply(this.steps[Math.floor(f)%40],this.steps[(Math.floor(f)+1)%40],f%1);}
  const sit=smooth((t-3.65)/1.7);this.hero.position.z=.52+(.5-.52)*u+(.18-.5)*sit;
  if(t>=3.65){this.hero.rotation.y=Math.PI;this.apply(this.idle,this.seated,sit);}
  const chair=this.scene.getTransformNodeByName('chairDesk-pivot');if(chair)chair.position.z=.95+(.29-.95)*sit;
  this.showThought(t>5.8&&t<9.5?'Это было удивительное приключение!':'',1.5);
  const fade=smooth((t-9.7)/2);this.finale.hidden=fade<=0;this.finale.style.opacity=String(fade);
  (this.finale.firstElementChild as HTMLElement).style.opacity=String(smooth((t-11.7)/1));
 }
 update(dt:number){
  if(this.received){this.closing(dt);return;}
  this.time+=dt;const preview=import.meta.env.DEV?Number(new URLSearchParams(location.search).get('previewGiftTime')):0;const t=preview>0?preview:this.time;
  this.apply(this.idle,this.idle,0);
  const middle=new Vector3(-1.8,this.start.y,.55),end=new Vector3(-1.25,this.start.y,.52);
  if(t<8){this.hero.position.copyFrom(this.start);this.hero.rotation.y=Math.PI+(Math.atan2(end.x-this.start.x,end.z-this.start.z)-Math.PI)*smooth((t-4)/1.2);}
  else if(t<12.5){
   const u=Math.min(1,(t-8)/4.5),total=Vector3.Distance(this.start,middle)+Vector3.Distance(middle,end),split=Vector3.Distance(this.start,middle)/total;
   const a=u<split?this.start:middle,b=u<split?middle:end,v=u<split?u/split:(u-split)/(1-split);
   Vector3.LerpToRef(a,b,v,this.hero.position);
   const angle=Math.atan2(b.x-a.x,b.z-a.z);this.hero.rotation.y+=Math.atan2(Math.sin(angle-this.hero.rotation.y),Math.cos(angle-this.hero.rotation.y))*Math.min(1,dt*9);
   const f=u*total/1.45*this.steps.length;this.apply(this.steps[Math.floor(f)%40],this.steps[(Math.floor(f)+1)%40],f%1);
  }else{this.hero.position.copyFrom(end);this.hero.rotation.y+=(Math.atan2(Math.sin(Math.PI-this.hero.rotation.y),Math.cos(Math.PI-this.hero.rotation.y)))*Math.min(1,dt*6);}
  const lift=smooth((t-14.5)/1.8),reach=smooth((t-13)/1.5);
  const held=end.add(new Vector3(0,1.12,-.36));Vector3.LerpToRef(this.giftStart,held,lift,this.gift.position);
  this.grip.position.copyFrom(this.gift.position);this.grip.rotation.y=this.hero.rotation.y;
  this.squat(reach*(1-lift));
  this.pose.update(reach,.35*reach*(1-lift));
  this.lid.rotation.x=-1.95*smooth((t-16.7)/1.4);
  const thought=t>1&&t<4.3?'Теперь я наконец разобрался. Всё встало на свои места.':t>5.5&&t<8?'Хм… Подарок? А это от кого?':'';
  this.showThought(thought);
  if(t>=18.5){this.gift.setEnabled(false);this.pose.update(0);}
  if(t>=18.5&&this.letter.hidden){this.letter.hidden=false;this.letter.querySelector('a')?.focus({preventScroll:true});}
 }
 dispose(){this.pose.dispose();this.thought.remove();this.letter.remove();this.finale.remove();}
}

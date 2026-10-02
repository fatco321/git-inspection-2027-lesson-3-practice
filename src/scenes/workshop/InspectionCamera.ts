import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import type { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import type { Scene } from '@babylonjs/core/scene';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import type { InspectionObject } from './CaseObjects';
import type { Photo } from '../../practice/PracticeState';
export class InspectionCamera {
 private readonly camera:FreeCamera;
 private drag=false;private pointer?:number;private hidden:{mesh:any;visibility:number}[]=[];
 active=false;
 constructor(private scene:Scene,private canvas:HTMLCanvasElement,private orbit:ArcRotateCamera,private hero:TransformNode,private objects:InspectionObject[]){
  this.camera=new FreeCamera('tablet lens',Vector3.Zero(),scene);this.camera.minZ=.05;this.camera.inputs.clear();
  canvas.addEventListener('pointerdown',this.down);canvas.addEventListener('pointermove',this.move);canvas.addEventListener('pointerup',this.up);canvas.addEventListener('pointercancel',this.up);canvas.addEventListener('wheel',this.wheel,{passive:false});
 }
 start(){this.active=true;this.orbit.detachControl();this.camera.position.copyFrom(this.hero.position.add(new Vector3(0,1.5,0)));this.camera.rotation.set(.16,this.hero.rotation.y,0);this.camera.fov=.95;this.scene.activeCamera=this.camera;this.hidden=this.hero.getChildMeshes().map(mesh=>({mesh,visibility:mesh.visibility}));this.hidden.forEach(x=>x.mesh.visibility=0);}
 stop(){this.active=false;this.up();this.hidden.forEach(x=>x.mesh.visibility=x.visibility);this.hidden=[];this.scene.activeCamera=this.orbit;}
 private down=(e:PointerEvent)=>{if(!this.active)return;this.drag=true;this.pointer=e.pointerId;this.canvas.setPointerCapture(e.pointerId);};
 private move=(e:PointerEvent)=>{if(!this.active||!this.drag)return;this.camera.rotation.y+=e.movementX*.006;this.camera.rotation.x=Math.max(-.8,Math.min(.9,this.camera.rotation.x+e.movementY*.006));};
 private up=()=>{this.drag=false;if(this.pointer!==undefined&&this.canvas.hasPointerCapture(this.pointer))this.canvas.releasePointerCapture(this.pointer);this.pointer=undefined;};
 private wheel=(e:WheelEvent)=>{if(!this.active)return;e.preventDefault();this.camera.fov=Math.max(.28,Math.min(1.2,this.camera.fov+e.deltaY*.001));};
 capture():Omit<Photo,'sent'|'image'>{
  const camera=this.camera,forward=camera.getForwardRay().direction;
  const overview=this.objects.find(x=>x.id==='workshop')!;const delta=overview.point.subtract(camera.position);
  if(camera.position.z> -2.8&&camera.position.z<0.2&&delta.length()>3&&Vector3.Dot(delta.normalize(),forward)>.86&&camera.fov>.85)return {subject:'workshop',detail:false};
  const ranked=this.objects.filter(o=>o.id!=='workshop').map(o=>{
   const delta=o.label.subtract(camera.position),distance=delta.length(),labelDot=Vector3.Dot(delta.normalize(),forward);const objectDot=Vector3.Dot(o.point.subtract(camera.position).normalize(),forward);return {o,distance,labelDot,dot:Math.max(labelDot,objectDot)};
  }).filter(x=>x.dot>.9&&x.distance<6).sort((a,b)=>b.dot-a.dot);
  const best=ranked[0];
  if(best){
   const {o,distance}=best;const ray=new Ray(camera.position,o.label.subtract(camera.position).normalize(),distance);
   const block=this.scene.pickWithRay(ray,m=>m.isEnabled()&&m.isVisible&&m.visibility>0&&m.name!=='__root__'&&!m.name.startsWith('label ')&&!m.name.includes('glass')&&!m.name.includes('window')&&!(m.material?.alpha!<1)&&m.metadata?.subject!==o.id&&!m.name.startsWith('floor')&&!m.name.includes('cabinet')&&!m.name.startsWith('stock')&&!m.name.startsWith('box-'));
   if(block?.hit&&block.distance<distance-.25)return {subject:o.id,detail:false,issue:'occluded'};
   const detail=camera.fov<.7&&distance<2.6&&best.labelDot>.98;
   if(detail){
    const right=Vector3.Cross(Vector3.Up(),forward).normalize(),up=Vector3.Cross(forward,right).normalize();
    const tan=Math.tan(camera.fov/2),aspect=this.canvas.width/this.canvas.height;
    for(const x of [-.36,.36])for(const y of [-.13,.13]){
     const d=o.label.add((o.labelRight??Vector3.Right()).scale(x)).add(new Vector3(0,y,0)).subtract(camera.position),depth=Vector3.Dot(d,forward);
     if(depth<=0||Math.abs(Vector3.Dot(d,right))>depth*tan*aspect*.9||Math.abs(Vector3.Dot(d,up))>depth*tan*.9)return {subject:o.id,detail:true,issue:'labelCropped'};
    }
   }
   if(!detail&&(distance<1.5||camera.fov<.7))return {subject:o.id,detail:false,issue:'objectCropped'};
   return {subject:o.id,detail};
  }
  if(camera.position.z> -2.8&&camera.position.z<0.2&&delta.length()>3&&Vector3.Dot(delta.normalize(),forward)>.82&&camera.fov>.85)return {subject:'workshop',detail:false};
  return {subject:'unknown',detail:false,issue:'unrecognizable'};
 }
 dispose(){this.stop();this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerup',this.up);this.canvas.removeEventListener('pointercancel',this.up);this.canvas.removeEventListener('wheel',this.wheel);this.camera.dispose();}
}

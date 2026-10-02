import '../../src/style.css';
import {PracticeGame} from '../../src/game/PracticeGame';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
const game=new PracticeGame(document.querySelector('canvas')!) as any;
await game.ready;
const flow=game.flow;flow.ui.close();flow.started=true;flow.state.phase='call';flow.state.profile='organisation';flow.state.confirmed=true;flow.state.permissions={camera:true,microphone:true,location:true};flow.state.connect();flow.ui.hud(()=>flow.menu(),()=>flow.help());game.controls(true);
const bar=document.createElement('nav');bar.style.cssText='position:fixed;right:6px;top:60px;display:flex;gap:4px;flex-direction:column;z-index:99';document.body.append(bar);
function add(label:string,fn:()=>void){const b=document.createElement('button');b.textContent=label;b.onclick=fn;bar.append(b);}
function position(x:number,z:number,aim:Vector3){game.closeCamera();flow.ui.close();game.hero.position.x=x;game.hero.position.z=z;game.hero.rotation.y=Math.atan2(aim.x-x,aim.z-z);game.camera.target.copyFrom(game.hero.position.add(new Vector3(0,.8,0)));}
function shot(slot:string,x:number,z:number,target:string,detail=false){const o=game.objects.find((o:any)=>o.id===target);position(x,z,o.label);game.openCamera(slot);game.lens.camera.setTarget(detail?o.label:o.point);game.lens.camera.fov=detail?.65:1.05;}
add('Тени стола',()=>{position(-1,2,new Vector3(-1.7,1,.16));game.walk.setEnabled(false);game.camera.target.set(-1.7,.75,.16);game.camera.alpha=1.1;game.camera.beta=.85;game.camera.radius=5;});
add('Тени склада',()=>{position(3,-8.1,new Vector3(-1,1,-10));game.walk.setEnabled(false);game.camera.target.set(-.5,.8,-9.5);game.camera.alpha=1.15;game.camera.beta=.9;game.camera.radius=8;});
add('Верстак сбоку',()=>{position(.2,-4.1,new Vector3(-2.3,1,-5.8));game.walk.setEnabled(false);game.camera.target.set(-2.3,.85,-5.8);game.camera.alpha=.25;game.camera.beta=1.05;game.camera.radius=4.5;});
add('Рабочее место',()=>{position(1,-3,new Vector3(-2,1,-5.5));game.walk.setEnabled(false);game.camera.target.set(-1,1,-5.1);game.camera.alpha=1.15;game.camera.beta=1.02;game.camera.radius=7;});
add('Станки у стены',()=>{position(-1,-3.2,new Vector3(-4.5,1,-3.2));game.camera.alpha=.3;game.camera.beta=.9;game.camera.radius=6;});
add('Общий вид',()=>shot('overview',3.35,-1.25,'workshop'));
add('ПР-204 общий',()=>shot('machineView',-1.8,-2.15,'m204'));
add('ПР-204 маркировка',()=>shot('machineLabel',-1.9,-2.15,'m204',true));
add('ПР-208 вместо 204',()=>shot('machineLabel',-1.9,-4.25,'m208',true));
add('С-3 общий',()=>shot('stockView',1.6,-7.9,'s3'));
add('С-1 общий',()=>shot('stockView',-3.8,-7.9,'s1'));
add('С-1 маркировка',()=>shot('stockLabel',-3.8,-8.1,'s1',true));
add('Кадр без объекта',()=>{delete flow.state.photos.machineLabel;position(3,2,new Vector3(3,1,4));game.openCamera('machineLabel');game.lens.camera.setTarget(new Vector3(3,10,8));});
add('Документы',()=>{position(-1.7,1.6,new Vector3(-1.7,1,.16));flow.archive();});
add('Чат: неверное фото',()=>{flow.state.putPhoto('machineLabel',{subject:'m208',detail:true,image:game.canvas.toDataURL('image/jpeg',.4),sent:false});flow.chat();});
add('Чат: верное фото',()=>{flow.state.putPhoto('machineLabel',{subject:'m204',detail:true,image:game.canvas.toDataURL('image/jpeg',.4),sent:false});flow.chat();});

add('Стрелка 1с',()=>{flow.ui.close();game.controls(true);document.querySelector('canvas')!.focus();window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowUp'}));setTimeout(()=>window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowUp'})),1000);});
add('Планшет',()=>{game.closeCamera();flow.menu();});
add('Скрыть проверку',()=>bar.remove());

add('Возврат: подарок',()=>{flow.ui.hideAll();game.controls(false);void game.arriveHome();});

add('Прибытие Андрея',()=>{position(-1,2.3,new Vector3(1.1,1,2.3));flow.ui.hideAll();flow.endingStage='waiting';game.controls(true);game.camera.target.set(.3,.85,2.3);game.camera.radius=5;game.guide.show();});

add('Журнал: подписание',()=>{
 const s=flow.state;s.route=['overview','machine','stock'];s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:true};s.reconnectRequired=false;s.phase='call';s.selectedDocuments=['m204','s1'];
 for(const [id,subject,detail] of [['overview','workshop',false],['machineView','m204',false],['machineLabel','m204',true],['stockView','s1',false],['stockLabel','s1',true]] as const)s.photos[id]={subject,detail,sent:true,image:''};
 s.attachments={machine:'m204',stock:'s1'};flow.review();
});

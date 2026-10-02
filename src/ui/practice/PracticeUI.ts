import './practice.css';
export type Action={label:string;run:()=>void;secondary?:boolean;disabled?:boolean};
export class PracticeUI {
 readonly root=document.createElement('div');
 private panel=document.createElement('section');
 private header=document.createElement('nav');
 private cue=document.createElement('div');
 private notice=document.createElement('div');
 private camera=document.createElement('section');
 private timer?:number;
 private photoFlight?:Animation;
 private onClose?:()=>void;
 open=false;
 constructor(private active:(open:boolean)=>void){
  this.root.className='practice-ui';this.panel.className='practice-panel';this.panel.hidden=true;this.panel.setAttribute('role','dialog');
  this.header.className='practice-hud';this.header.hidden=true;this.cue.className='interaction-cue';this.cue.hidden=true;this.notice.className='practice-toast';this.notice.setAttribute('role','status');this.notice.hidden=true;this.camera.className='camera-view';this.camera.hidden=true;
  this.root.append(this.header,this.cue,this.panel,this.notice,this.camera);document.body.append(this.root);
 }
 button(a:Action){const b=document.createElement('button');b.type='button';b.textContent=a.label;b.disabled=!!a.disabled;if(a.secondary)b.className='secondary';b.onclick=a.run;return b;}
 text(parent:HTMLElement,text:string,cls=''){const p=document.createElement('p');p.textContent=text;p.className=cls;parent.append(p);return p;}
 actions(parent:HTMLElement,actions:Action[]){const row=document.createElement('div');row.className='actions';actions.forEach(a=>row.append(this.button(a)));parent.append(row);return row;}
 show(title:string,text:string,actions:Action[]=[],close?:()=>void){
  this.panel.classList.remove('start-panel','tablet-menu','chat-panel','camera-disabled');this.root.classList.remove('start-screen');this.open=true;this.active(true);this.onClose=close;this.panel.replaceChildren();const h=document.createElement('h1');h.textContent=title;this.panel.append(h);if(text)this.text(this.panel,text);this.actions(this.panel,actions);this.panel.hidden=false;this.panel.scrollTop=0;this.panel.querySelector('button')?.focus();return this.panel;
 }
 menu(title:string,text:string,actions:Action[]){
  const close=actions[actions.length-1];
  this.show(title,text,actions.slice(0,-1));
  const content=document.createElement('div');content.className='tablet-menu-content';
  content.append(...Array.from(this.panel.childNodes));
  const footer=document.createElement('div');footer.className='tablet-menu-footer';footer.append(this.button(close));
  this.panel.append(content,footer);this.panel.classList.add('tablet-menu');
  content.querySelector('button')?.focus({preventScroll:true});
 }
 start(actions:Action[]){this.show('','',actions);this.panel.classList.add('start-panel');this.root.classList.add('start-screen');}
 setTabletReady(ready:boolean,active:boolean){
  const waiting=active&&!ready,wasWaiting=this.panel.classList.contains('tablet-opening');
  this.panel.classList.toggle('tablet-opening',waiting);this.panel.inert=waiting;
  if(wasWaiting&&!waiting&&this.open)this.panel.querySelector('button')?.focus({preventScroll:true});
 }
 anchor(x:number,y:number){this.panel.style.setProperty('--anchor-x',x+'px');this.panel.style.setProperty('--anchor-y',y+'px');}
 close(){this.root.classList.remove('start-screen');this.open=false;this.panel.hidden=true;this.active(false);this.onClose?.();this.onClose=undefined;}
 hud(menu:()=>void,help:()=>void){this.header.replaceChildren(this.button({label:'Планшет',run:menu}),this.button({label:'Помощь',run:help,secondary:true}));this.header.hidden=false;}
 suspendHud(hidden:boolean){this.header.hidden=hidden;}
 setCue(text:string){this.cue.textContent=text;this.cue.hidden=!text;}
 toast(text:string){this.notice.textContent=text;this.notice.hidden=false;window.clearTimeout(this.timer);this.timer=window.setTimeout(()=>this.notice.hidden=true,5000);}
 cameraMode(label:string,shoot:()=>void,exit:()=>void){this.camera.replaceChildren();const title=document.createElement('div');title.className='camera-title';title.textContent=label;const reticle=document.createElement('div');reticle.className='reticle';const bottom=document.createElement('div');bottom.className='camera-bottom';this.text(bottom,'Перетащите изображение мышью. Колесо — масштаб.');this.actions(bottom,[{label:'Сделать снимок',run:shoot},{label:'Убрать планшет',run:exit,secondary:true}]);this.camera.append(title,reticle,bottom);this.camera.hidden=false;this.header.hidden=true;this.cue.hidden=true;}
 hideCamera(){this.camera.hidden=true;this.header.hidden=false;}
 async flyPhoto(image:string){
  this.camera.hidden=true;this.header.hidden=true;
  const frame=document.createElement('img');frame.className='captured-photo';frame.src=image;frame.alt='';
  this.root.append(frame);
  const rect=frame.getBoundingClientRect();
  const scale=Math.min(80/rect.width,60/rect.height);
  const destination=`translate(${18-rect.left}px, ${18-rect.top}px) scale(${scale})`;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animation=frame.animate([
   {transform:'translate(0, 0) scale(1)',opacity:1,offset:0},
   {transform:'translate(0, 0) scale(1)',opacity:1,offset:.2},
   {transform:destination,opacity:1,offset:.85},
   {transform:destination,opacity:0,offset:1},
  ],{duration:reduced?150:1050,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  this.photoFlight=animation;
  try{await animation.finished;return true;}catch{return false;}
  finally{animation.cancel();frame.remove();if(this.photoFlight===animation)this.photoFlight=undefined;}
 }
 thumbnail(parent:HTMLElement,src:string,label:string){const img=document.createElement('img');img.className='evidence';img.src=src;img.alt=label;parent.append(img);}
 hideAll(){this.close();this.header.hidden=true;this.cue.hidden=true;this.camera.hidden=true;}
 dispose(){this.photoFlight?.cancel();window.clearTimeout(this.timer);this.root.remove();}
}

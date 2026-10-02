import { PracticeState, TASKS, SHOTS, DOCUMENTS, PHOTO_REPLIES, type ShotId, type TaskId } from './PracticeState';
import { PracticeUI } from '../ui/practice/PracticeUI';
import { DialogueWindow } from '../ui/dialogue/DialogueWindow';
export class PracticeFlow {
 state=new PracticeState();
 readonly ui:PracticeUI;
 readonly dialogue:DialogueWindow;
 private started=false;
 endingStage:'none'|'waiting'|'talking'|'departing'='none';
 constructor(private controls:(enabled:boolean)=>void,private camera:()=>void,private ending:()=>void,private meeting:()=>void){
  this.ui=new PracticeUI(open=>this.controls(this.started&&!open&&!this.dialogue?.isOpen));
  this.dialogue=new DialogueWindow(open=>{this.ui.suspendHud(open);this.controls(this.started&&!open&&!this.ui.open);});
 }
 get tabletOpen(){return this.started&&(this.ui.open||(this.dialogue.isOpen&&this.endingStage!=='talking'));}
 ready(){
  const start=()=>{this.started=true;this.ui.close();this.ui.hud(()=>this.menu(),()=>this.help());this.say(['В мастерской всё готово. В приглашении — три запроса. Сначала разберись, что мне нужно увидеть, осмотри помещения и подготовь материалы.','Сам выбери маршрут. В чате должны оказаться изображения и документы, которые относятся к одним и тем же объектам. Если ты сфотографируешь станок, который не требуется, я не приму это фото','Если понадобится помощь, обратись ко мне через планшет. Когда будешь готов, подключайся.'],()=>this.help());};
  this.ui.start([{label:'Начать',run:start}]);
 }
 say(lines:string[],next?:()=>void,lastLabel?:string){this.ui.close();this.dialogue.open(lines.map((text,index)=>({speaker:'Андрей',portrait:import.meta.env.BASE_URL+'images/characters/andrey-cartoon-v2.png',text,nextLabel:index===lines.length-1?lastLabel:undefined})),next);}
 help(){
  const panel=this.ui.show('Помощь','Ваша задача — провести дистанционный осмотр мастерской и выполнить три запроса инспектора. Исследуйте помещения, собирайте материалы и отправляйте их Андрею через планшет.');
  this.record(panel,'Управление','Используйте ↑ ↓ ← → для передвижения.\nЗажмите левую кнопку мыши и двигайте мышь, чтобы осмотреться. Прокрутите колёсико, чтобы приблизить или отдалить камеру.\nПодойдите к предмету или персонажу и нажмите Enter, когда появится подсказка.');
  this.record(panel,'Планшет','Нажмите «Планшет», чтобы открыть приглашение, проверить запросы и составить свой маршрут. Перед осмотром подтвердите участие, настройте профиль и разрешения, затем подключитесь.\nЧтобы вернуться к передвижению, нажмите «Убрать планшет».');
  this.record(panel,'Снимки и документы','Подойдите к объекту и откройте «Камеру» в планшете. Выберите ракурс мышью и нажмите «Сделать снимок». Фотография появится в галерее.\nДокументы ищите на столе в комнате подготовки. Прочитайте нужный документ и возьмите его в подборку.');
  this.record(panel,'Отправка инспектору','Откройте «Чат» → «Прикрепить». Выберите фото или документ, затем реплику, которая объясняет, что вы отправляете.\nАндрей проверит материал. Если он не подходит, прочитайте ответ и попробуйте снова. Принятые материалы отмечаются галочкой в запросах инспектора — повторно отправлять их не нужно.');
  this.record(panel,'Если застряли','Нажмите «Попросить подсказку» в планшете. Когда все материалы будут приняты, Андрей сам сообщит о завершении проверки и подскажет, куда идти дальше.');
  this.ui.actions(panel,[{label:'Понятно',run:()=>this.ui.close()}]);
 }

 menu(){
  if(this.endingStage!=='none'){this.ui.show('Андрей ждёт в комнате подготовки','Вернитесь в помещение со столом и документами.',[{label:'Назад',run:()=>this.ui.close()}]);return;}
  this.ui.menu('Инспектор · «Маяк»',this.state.phase==='prepare'?'Мероприятие ВКС-317 · мастерская\nПодготовка к подключению.':'Мероприятие ВКС-317 · Андрей',[
   {label:'Приглашение и запросы',run:()=>this.invitation()},
   {label:'Профиль и разрешения',run:()=>this.settings()},
   {label:'Мой маршрут',run:()=>this.route()},
   {label:'Чат',run:()=>this.chat()},
   {label:'Камера',run:()=>{this.ui.close();this.camera();}},
   ...(this.state.phase==='prepare'?[{label:'Подключиться',run:()=>this.connect()}]:[
    ...(this.state.reconnectRequired?[{label:'Подключиться',run:()=>this.connect()}]:[]),
    {label:'Запросы инспектора',run:()=>this.requests()},
    {label:'Журнал мероприятия',run:()=>this.journal()},
   ]),{label:'Попросить подсказку',run:()=>this.hint()},{label:'Убрать планшет',secondary:true,run:()=>this.ui.close()},
  ]);
 }
 private connect(){
  const resumed=this.state.phase!=='prepare';const issue=this.state.connect();
  if(issue){this.ui.toast(issue);return;}
  this.say([resumed?'Связь восстановлена. Продолжим с того места, где остановились.':'Покажи объекты, которые я запросил, в том порядке, в котором ты выбрал. Снимки и документы отправляй в чат этого мероприятия.'],()=>this.requests());
 }
 checkConnection(capture=false){
  const issue=this.state.actionIssue(capture);if(!issue)return true;
  const panel=this.ui.show(capture&&!this.state.permissions.camera?'Камера отключена':'Подключение приостановлено',issue,[
   {label:'Открыть настройки',run:()=>this.settings()},
   ...(this.state.reconnectRequired&&!this.state.connectionIssue()?[{label:'Подключиться',run:()=>this.connect()}]:[]),
   {label:'Назад',secondary:true,run:()=>this.menu()},
  ]);
  if(capture&&!this.state.permissions.camera)panel.classList.add('camera-disabled');
  this.state.connectionMessage=issue;
  return false;
 }
 invitation(){const panel=this.ui.show('Приглашение · ВКС-317','Получатель: организация «Маяк». Объект: мастерская.\nИнспектор: Андрей Криницын.\nМатериалы передавайте в чат этого мероприятия.',[
  {label:this.state.confirmed?'Участие подтверждено':'Подтвердить участие',disabled:this.state.confirmed,run:()=>{this.state.confirmed=true;this.invitation();}}, {label:'Назад',secondary:true,run:()=>this.menu()},
 ]);for(const t of TASKS){const box=this.record(panel,t.title,t.request);this.ui.actions(box,[{label:this.state.route.includes(t.id)?'Убрать из маршрута':'Добавить в маршрут',run:()=>{this.state.toggleRoute(t.id);this.invitation();},secondary:true}]);}}
 settings(){const s=this.state;this.ui.show('Профиль и разрешения','Профиль: '+(s.profile==='organisation'?'организация «Маяк»':s.profile==='personal'?'личный':'не выбран'),[
  {label:'Личный профиль',secondary:s.profile!=='personal',run:()=>{s.setProfile('personal');this.settings();}},
  {label:'Организация «Маяк»',secondary:s.profile!=='organisation',run:()=>{s.setProfile('organisation');this.settings();}},
  ...(['camera','microphone','location'] as const).map((key,i)=>({label:['Камера','Микрофон','Местоположение'][i]+': '+(s.permissions[key]?'разрешено':'отключено'),secondary:!s.permissions[key],run:()=>{s.setPermission(key,!s.permissions[key]);this.settings();}})),
  ...(s.reconnectRequired?[{label:'Подключиться',run:()=>this.connect()}]:[]),
  {label:'Назад',secondary:true,run:()=>this.menu()},
 ]);if(s.connectionMessage)this.ui.toast(s.connectionMessage);}
 route(){const panel=this.ui.show('Мой маршрут','Выберите пункты и расположите их в удобном порядке. В итоговом комплекте должны быть выполнены все запросы инспектора.',[{label:'Назад',secondary:true,run:()=>this.menu()}]);
  this.state.route.forEach((id,i)=>{const t=TASKS.find(t=>t.id===id)!;const box=this.record(panel,`${i+1}. ${t.title}`,this.state.accepted.includes(id)?'Подтверждено инспектором':t.request);this.ui.actions(box,[{label:'Выше',disabled:i===0,run:()=>{[this.state.route[i-1],this.state.route[i]]=[id,this.state.route[i-1]];this.route();}},{label:'Убрать',secondary:true,run:()=>{this.state.toggleRoute(id);this.route();}}]);});
  TASKS.filter(t=>!this.state.route.includes(t.id)).forEach(t=>this.ui.actions(panel,[{label:'Добавить: '+t.title,run:()=>{this.state.toggleRoute(t.id);this.route();}}]));
 }
 archive(){const panel=this.ui.show('Документы мастерской','Сверьте обозначения и редакции. Добавляйте нужные документы в подборку на планшете.',[{label:'Назад',secondary:true,run:()=>this.ui.close()}]);
  for(const doc of DOCUMENTS){const box=this.record(panel,doc.title,'');this.ui.actions(box,[{label:'Прочитать',run:()=>{this.ui.show(doc.title,doc.text,[{label:this.state.selectedDocuments.includes(doc.id)?'Убрать из подборки':'Взять в подборку',run:()=>{this.state.selectedDocuments=this.state.selectedDocuments.includes(doc.id)?this.state.selectedDocuments.filter(x=>x!==doc.id):[...this.state.selectedDocuments,doc.id];this.archive();}},{label:'Назад',secondary:true,run:()=>this.archive()}]);}}]);}
 }
 requests(){
  const panel=this.ui.show('Запросы инспектора','',[{label:'Назад',secondary:true,run:()=>this.menu()}]);
  const row=(parent:HTMLElement,label:string,accepted:boolean)=>{
   const item=document.createElement('div');item.className='request-photo-accepted';
   const name=document.createElement('span');name.textContent=label;
   const status=document.createElement('strong');status.textContent=accepted?'✓ Принято':'□ Ожидает';
   item.append(name,status);parent.append(item);
  };
  for(const task of TASKS){
   const box=this.record(panel,task.title,task.request);
   for(const shot of SHOTS.filter(s=>s.task===task.id))row(box,shot.label,this.state.photoFeedback(shot.id).ok);
   if(task.id!=='overview'){
    const doc=DOCUMENTS.find(d=>d.id===this.state.attachments[task.id as 'machine'|'stock']);
    row(box,task.id==='machine'?'Действующая карточка оборудования':'Действующая ведомость секции',!!doc&&doc.current&&doc.subject===(task.id==='machine'?'m204':'s1'));
   }
  }
 }
 chat(focusOrder?:number){
  const panel=this.ui.show('Чат','');panel.classList.add('chat-panel');
  const history=document.createElement('div');history.className='chat-history';
  let latest:HTMLElement|undefined;
  if(this.state.connectionMessage)this.message(history,'Андрей',this.state.connectionMessage,'correction');
  for(const entry of this.state.chat){
    const outgoing=this.message(history,'Вы',entry.caption??PHOTO_REPLIES[entry.shot],'outgoing');
    if(entry.document){const doc=DOCUMENTS.find(d=>d.id===entry.document);this.ui.text(outgoing,'▤ '+(doc?.title??'Документ'),'chat-file');}
    else this.ui.thumbnail(outgoing,entry.image,'Отправленное фото');
    this.message(history,'Андрей',entry.response,entry.accepted?'approved':'correction');
    if(entry.order===focusOrder)latest=outgoing;
  }
  if(!this.state.chat.length)this.ui.text(history,'Прикрепите фото или документ.');
  const footer=document.createElement('div');footer.className='chat-footer';
  this.ui.actions(footer,[{label:'Прикрепить',disabled:this.state.phase==='prepare',run:()=>this.attachMenu()},{label:'Назад',secondary:true,run:()=>this.menu()}]);
  panel.append(history,footer);
  if(latest)history.scrollTop=latest.offsetTop-history.offsetTop;else history.scrollTop=history.scrollHeight;
 }
 private attachMenu(){this.ui.show('Прикрепить','',[
  {label:'Фото',run:()=>this.photoGallery()},{label:'Документ',run:()=>this.documentPicker()},
  {label:'Назад',secondary:true,run:()=>this.chat()},
 ]);}
 private photoGallery(){
  const panel=this.ui.show('Фото','',[{label:'Назад',secondary:true,run:()=>this.attachMenu()}]);
  const grid=document.createElement('div');grid.className='photo-gallery';panel.append(grid);
  this.state.gallery.forEach((photo,index)=>{
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Фото '+(index+1));
    const img=document.createElement('img');img.src=photo.image;img.alt='';button.append(img);
    button.onclick=()=>this.composePhoto(index);grid.append(button);
  });
  if(!this.state.gallery.length)this.ui.text(panel,'Пока нет фотографий. Откройте камеру в меню планшета и сделайте снимок.');
 }
 private composePhoto(index:number,claim?:ShotId){
  const photo=this.state.gallery[index];if(!photo){this.photoGallery();return;}
  const panel=this.ui.show('Сообщение','');this.ui.thumbnail(panel,photo.image,'Выбранное фото');
  const choices=this.ui.actions(panel,SHOTS.map(shot=>({label:PHOTO_REPLIES[shot.id],secondary:claim!==shot.id,disabled:this.state.photoFeedback(shot.id).ok,run:()=>this.composePhoto(index,shot.id)})));
  choices.classList.add('reply-choices');choices.setAttribute('aria-label','Что изображено на фото');
  Array.from(choices.querySelectorAll('button')).forEach((button,i)=>button.setAttribute('aria-pressed',String(claim===SHOTS[i].id)));
  this.ui.actions(panel,[{label:'Отправить',disabled:!claim,run:()=>{if(claim&&this.checkConnection()&&this.state.sendGalleryPhoto(index,claim)){this.afterSubmission();}}},{label:'Назад',secondary:true,run:()=>this.photoGallery()}]);
 }
 private documentPicker(){
  const panel=this.ui.show('Документы','',[{label:'Назад',secondary:true,run:()=>this.attachMenu()}]);
  for(const id of this.state.selectedDocuments){const doc=DOCUMENTS.find(d=>d.id===id)!;this.ui.actions(panel,[{label:doc.title,run:()=>this.composeDocument(id)}]);}
  if(!this.state.selectedDocuments.length)this.ui.text(panel,'Подборка пуста. Документы находятся на столе в комнате подготовки.');
 }
 private composeDocument(id:string,task?:'machine'|'stock'){
  const doc=DOCUMENTS.find(d=>d.id===id)!;
  const panel=this.ui.show(doc.title,doc.text);
  this.ui.actions(panel,[{label:'Отправляю карточку оборудования ПР-204.',secondary:task!=='machine',run:()=>this.composeDocument(id,'machine')},{label:'Отправляю ведомость секции С-1.',secondary:task!=='stock',run:()=>this.composeDocument(id,'stock')}]);
  this.ui.actions(panel,[{label:'Отправить',disabled:!task,run:()=>{if(task&&this.checkConnection()&&this.state.sendDocument(task,id)){this.afterSubmission();}}},{label:'Назад',secondary:true,run:()=>this.documentPicker()}]);
 }
 private afterSubmission(){
  if(this.state.allMaterialsAccepted)this.review();else this.chat(this.state.chatOrder);
 }
 private message(parent:HTMLElement,sender:string,text:string,status:string){
  const box=document.createElement('div');box.className='chat-message '+status;
  const name=document.createElement('strong');name.textContent=sender;box.append(name);
  this.ui.text(box,text);parent.append(box);return box;
 }
 journal(){const panel=this.ui.show('Журнал мероприятия','Ответы и результаты фиксирует инспектор. Ниже — состояние переданных материалов.',[{label:'Назад',secondary:true,run:()=>this.menu()}]);for(const task of TASKS)this.record(panel,task.title,this.state.accepted.includes(task.id)?'Андрей: сведения подтверждены':'Ожидает сверки инспектором');}
 review(){if(this.endingStage!=='none'){this.menu();return;}if(!this.checkConnection())return;const issues=this.state.review();if(!issues.length){
  this.say(['Все три запроса подтверждены. Осмотр завершён. Я жду тебя в комнате подготовки — там, где мы начали. Встретимся лично.'],()=>{
   this.endingStage='waiting';this.ui.hideAll();this.meeting();this.controls(true);
  });return;
 }
  const panel=this.ui.show('Андрей · комплект требует уточнения','Подтверждённые пункты сохранены. Исправьте недостающие или несогласованные материалы и отправьте комплект повторно.',[{label:'Вернуться к осмотру',run:()=>this.ui.close()},{label:'Открыть чат',secondary:true,run:()=>this.chat()}]);for(const issue of issues)this.record(panel,TASKS.find(t=>t.id===issue.task)!.title,issue.text);
 }
 meetGuide(){
  if(this.endingStage!=='waiting')return;
  this.endingStage='talking';this.controls(false);
  this.say(['Молодец! Ты во всём разобрался: подготовился к осмотру, показал нужные объекты и передал подходящие фотографии и документы.','Наше путешествие по цифровому миру охраны труда подошло к концу. Теперь пора возвращаться на работу. Готов? Я помогу тебе перенестись'],()=>{
   if(this.state.finish()){this.endingStage='departing';this.ui.hideAll();this.controls(false);this.ending();}
  },'Готов');
 }
 hint(){this.state.hints++;let text='Проверь не только то, что уже снято, но и то, что действительно попало в чат. Галерея и переданные материалы — разные вещи.';
  if(this.state.phase==='prepare')text='До звонка полезно сопоставить перечень запросов с тем, что есть в помещении. Одинаковые на вид установки могут иметь разные номера.';
  else if(!this.state.photos.machineLabel)text='Общий вид рассказывает, как выглядит объект. Небольшая табличка рассказывает, какой именно это объект.';
  else if(!this.state.selectedDocuments.length)text='Внешне одинаковые карточки могут относиться к разным годам и разным объектам. На столе есть сведения, которых не видно в камеру.';
  else if(!this.state.photos.stockLabel)text='На складе ориентируйся на обозначение секции. Цвет коробок сам по себе ничего не подтверждает.';
  this.say([text]);
 }
 private record(parent:HTMLElement,title:string,text:string){const box=document.createElement('div');box.className='record';const h=document.createElement('h2');h.textContent=title;box.append(h);if(text)this.ui.text(box,text);parent.append(box);return box;}
 dispose(){this.dialogue.dispose();this.ui.dispose();}
}

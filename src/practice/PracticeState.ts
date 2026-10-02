export type TaskId = 'overview' | 'machine' | 'stock';
export type ShotId = 'overview' | 'machineView' | 'machineLabel' | 'stockView' | 'stockLabel';
export type SubjectId = 'workshop' | 'm204' | 'm208' | 's1' | 's2' | 's3';
export const TASKS: {id:TaskId; title:string; request:string}[] = [
  {id:'overview',title:'Общий вид мастерской',request:'Покажите рабочий участок целиком: оборудование и проход между рабочими местами.'},
  {id:'machine',title:'Оборудование ПР-204',request:'Покажите установку ПР-204 целиком и её маркировку. Передайте актуальную карточку этого оборудования.'},
  {id:'stock',title:'Секция хранения С-1',request:'Покажите секцию С-1 с комплектами и её маркировку. Передайте действующую ведомость этой секции.'},
];
export const SHOTS: {id:ShotId; task:TaskId; label:string; detail:boolean}[] = [
  {id:'overview',task:'overview',label:'Рабочий участок целиком',detail:false},
  {id:'machineView',task:'machine',label:'Общий вид оборудования',detail:false},
  {id:'machineLabel',task:'machine',label:'Маркировка оборудования',detail:true},
  {id:'stockView',task:'stock',label:'Общий вид секции',detail:false},
  {id:'stockLabel',task:'stock',label:'Маркировка секции',detail:true},
];
export const PHOTO_REPLIES: Record<ShotId,string> = {
 overview:'Это общий вид мастерской.', machineView:'Это общий вид ПР-204.',
 machineLabel:'Это маркировка ПР-204.', stockView:'Это общий вид секции С-1.', stockLabel:'Это маркировка секции С-1.',
};
export const DOCUMENTS = [
  {id:'m208',title:'Карточка оборудования ПР-208',subject:'m208',current:true,text:'Мастерская «Маяк»\nОборудование: производственная установка ПР-208\nИнвентарный номер: 208\nРедакция: март 2027\nСтатус: действующая.'},
  {id:'s1-old',title:'Ведомость секции С-1 · архив',subject:'s1',current:false,text:'Склад мастерской «Маяк»\nСекция С-1. Перечень комплектов хранения.\nРедакция: октябрь 2025\nСтатус: архивная. Заменена ведомостью от марта 2027.'},
  {id:'m204-old',title:'Карточка оборудования ПР-204 · архив',subject:'m204',current:false,text:'Мастерская «Маяк»\nОборудование: производственная установка ПР-204\nИнвентарный номер: 204\nРедакция: июнь 2025\nСтатус: архивная. Заменена карточкой от марта 2027.'},
  {id:'s2',title:'Ведомость секции С-2',subject:'s2',current:true,text:'Склад мастерской «Маяк»\nСекция С-2. Перечень комплектов хранения.\nРедакция: март 2027\nСтатус: действующая.'},
  {id:'m204',title:'Карточка оборудования ПР-204',subject:'m204',current:true,text:'Мастерская «Маяк»\nОборудование: производственная установка ПР-204\nИнвентарный номер: 204\nРедакция: март 2027\nСтатус: действующая.'},
  {id:'s1',title:'Ведомость секции С-1',subject:'s1',current:true,text:'Склад мастерской «Маяк»\nСекция С-1. Перечень комплектов хранения.\nРедакция: март 2027\nСтатус: действующая.'},
];
export const PHOTO_ISSUES = ['occluded','labelCropped','objectCropped','unrecognizable'] as const;
export type PhotoIssue = typeof PHOTO_ISSUES[number];
export type Photo = {subject:SubjectId|'unknown'; issue?:PhotoIssue; detail:boolean; labelReadable?:boolean; image:string; sent:boolean; sentOrder?:number};
const SUBJECT_NAMES: Record<SubjectId,string> = {workshop:'мастерская',m204:'ПР-204',m208:'ПР-208',s1:'С-1',s2:'С-2',s3:'С-3'};
export type ChatPhoto = {notice?:boolean;order:number; shot:ShotId; image:string; response:string; accepted:boolean; caption?:string; document?:string};
export type ReviewIssue = {task:TaskId; text:string};
export class PracticeState {
  phase: 'prepare'|'call'|'review'|'done' = 'prepare';
  profile = '';
  confirmed = false;
  permissions = {camera:false,microphone:false,location:false};
  route: TaskId[] = [];
  selectedDocuments: string[] = [];
  attachments: Partial<Record<'machine'|'stock', string>> = {};
  photos: Partial<Record<ShotId,Photo>> = {};
  gallery: (Photo & {captureSlot?:ShotId})[] = [];
  accepted: TaskId[] = [];
  reviewCount = 0;
  journalSigned = false;
  private signatureRequested = false;
  chatOrder = 0;
  chat: ChatPhoto[] = [];
  hints = 0;
  reconnectRequired = false;
  connectionMessage = '';
  setProfile(profile:string){
    if(this.profile===profile)return;
    this.profile=profile;this.settingsChanged();
  }
  setPermission(key:'camera'|'microphone'|'location',enabled:boolean){
    if(this.permissions[key]===enabled)return;
    this.permissions[key]=enabled;this.settingsChanged();
  }
  private settingsChanged(){
    if(this.phase==='prepare'||this.phase==='done')return;
    this.reconnectRequired=true;
    this.connectionMessage=this.actionIssue()??'Настройки исправлены. Нажми «Подключиться», чтобы продолжить осмотр.';
  }
  actionIssue(capture=false):string|undefined {
    if(this.phase==='prepare')return 'Сначала подключитесь к мероприятию.';
    if(this.profile!=='organisation')return 'Приглашение адресовано организации «Маяк». Вернитесь в профиль организации и подключитесь снова.';
    if(!this.permissions.camera)return 'Камера отключена';
    if(!this.permissions.microphone)return 'Изображение вижу, но тебя не слышно. Проверь настройки подключения.';
    // Location loss allows collecting frames, but not submitting them.
    if(capture&&!this.permissions.location)return;
    if(!this.permissions.location)return 'Не могу подтвердить место съёмки. Проверь передачу местоположения.';
    if(this.reconnectRequired)return 'Настройки исправлены. Нажми «Подключиться», чтобы продолжить осмотр.';
  }
  connectionIssue(): string | undefined {
    if (this.profile !== 'organisation') return 'Приглашение адресовано организации «Маяк». Выберите её профиль для подключения.';
    if (!this.confirmed) return 'Участие в этом мероприятии ещё не подтверждено. Откройте приглашение.';
    if (!this.permissions.camera) return 'Андрей: «Связь есть, но изображение не передаётся. Проверьте настройки камеры».';
    if (!this.permissions.microphone) return 'Андрей: «Я вас вижу, но не слышу. Проверьте микрофон».';
    if (!this.permissions.location) return 'Проверка подключения не завершена: приложению недоступно местоположение.';
    return undefined;
  }
  connect() {
    const issue = this.connectionIssue();
    if (!issue){if(!this.route.length)this.createRoute();this.phase = 'call';this.reconnectRequired=false;this.connectionMessage='';}
    return issue;
  }
  private createRoute(){
    this.route=TASKS.map(t=>t.id);
    for(let i=this.route.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [this.route[i],this.route[j]]=[this.route[j],this.route[i]];
    }
    this.notice('Начнём осмотр. Наш маршрут: '+this.route.map((id,i)=>`${i+1}. ${TASKS.find(t=>t.id===id)!.title}`).join(' → ')+'. По каждому объекту сначала соберём все запрошенные материалы, затем перейдём дальше.');
  }
  taskComplete(task:TaskId){
    return SHOTS.filter(s=>s.task===task).every(s=>this.photoFeedback(s.id).ok)
      &&(task==='overview'||DOCUMENTS.some(d=>d.id===this.attachments[task]&&d.current&&d.subject===(task==='machine'?'m204':'s1')));
  }
  get currentTask(){return this.route.find(id=>!this.taskComplete(id));}
  private notice(text:string){
    this.chat.push({notice:true,order:++this.chatOrder,shot:'overview',image:'',response:text,accepted:false});
    if(this.chat.length>12)this.chat.shift();
  }
  private routeBlocked(task:TaskId){
    const current=this.currentTask;
    if(!current||current===task)return false;
    this.notice('Мы тут ещё не закончили: «'+TASKS.find(t=>t.id===current)!.title+'». Сначала передай все материалы по этому запросу. Что ещё осталось — посмотри в запросах инспектора.');
    return true;
  }
  private advanceRoute(previous:TaskId|undefined){
    if(previous&&this.taskComplete(previous)){
      const next=this.currentTask;
      this.notice(next?'По этому объекту всё принято. Теперь переходим к запросу «'+TASKS.find(t=>t.id===next)!.title+'».':'Все объекты маршрута пройдены, материалы приняты.');
    }
  }
  capturePhoto(photo:Photo){
    // A capture is not evidence until the player assigns and sends it in chat.
    const index=this.gallery.findIndex(p=>p.subject===photo.subject&&p.detail===photo.detail);
    const replacement={...photo,sent:false,sentOrder:undefined};
    if(index>=0)this.gallery[index]=replacement;else this.gallery.push(replacement);
    if(this.gallery.length>5)this.gallery.shift();
  }
  putPhoto(id:ShotId, photo:Photo) {
    this.photos[id] = {...photo, sent:false, sentOrder:undefined};
    const replacement={...photo,captureSlot:id,sent:false,sentOrder:undefined};
    const index=this.gallery.findIndex(p=>p.captureSlot===id);
    if(index<0)this.gallery.push(replacement);else this.gallery[index]=replacement;
    this.invalidate(SHOTS.find(x=>x.id===id)!.task);
  }
  sendPhoto(id:ShotId) {
    const photo=this.photos[id];
    if(!photo||photo.sent||this.actionIssue())return false;
    if(this.routeBlocked(SHOTS.find(s=>s.id===id)!.task))return true;
    const previous=this.currentTask;
    photo.sent=true;photo.sentOrder=++this.chatOrder;
    const feedback=this.photoFeedback(id);
    this.chat.push({order:this.chatOrder,shot:id,image:photo.image,response:feedback.text,accepted:feedback.ok});
    if(this.chat.length>12)this.chat.shift();
    this.invalidate(SHOTS.find(x=>x.id===id)!.task);
    this.advanceRoute(previous);
    return true;
  }
  sendGalleryPhoto(index:number,claim:ShotId){
    const photo=this.gallery[index];
    if(!photo||this.actionIssue()||this.photoFeedback(claim).ok)return false;
    if(this.routeBlocked(SHOTS.find(s=>s.id===claim)!.task))return true;
    this.photos[claim]={...photo,sent:false,sentOrder:undefined};
    const sent=this.sendPhoto(claim);
    if(sent){const entry=[...this.chat].reverse().find(e=>!e.notice&&e.shot===claim);if(entry)entry.caption=PHOTO_REPLIES[claim];}
    return sent;
  }
  sendDocument(task:'machine'|'stock',id:string){
    if(this.actionIssue())return false;
    if(this.routeBlocked(task))return true;
    const previous=this.currentTask;
    if(!this.attach(task,id))return false;
    const doc=DOCUMENTS.find(d=>d.id===id)!;
    const expected=task==='machine'?'m204':'s1';
    const ok=doc.subject===expected&&doc.current;
    const response=doc.subject!==expected?'Не подходит: документ относится к другому объекту. Сверь его обозначение с запросом.':!doc.current?'Не подходит: это архивная редакция. Нужен действующий документ.':'Документ подходит: объект и действующая редакция совпадают с запросом.';
    this.chat.push({order:++this.chatOrder,shot:task==='machine'?'machineView':'stockView',image:'',document:id,caption:task==='machine'?'Отправляю карточку оборудования ПР-204.':'Отправляю ведомость секции С-1.',response,accepted:ok});
    if(this.chat.length>12)this.chat.shift();
    this.advanceRoute(previous);
    return true;
  }
  get allMaterialsAccepted(){
    return SHOTS.every(shot=>this.photoFeedback(shot.id).ok)&&(['machine','stock'] as const).every(task=>{
      const doc=DOCUMENTS.find(d=>d.id===this.attachments[task]);
      return !!doc&&doc.current&&doc.subject===(task==='machine'?'m204':'s1');
    });
  }
  photoFeedback(id:ShotId): {ok:boolean;text:string} {
    const spec=SHOTS.find(x=>x.id===id)!;
    const photo=this.photos[id];
    if(!photo?.sent)return {ok:false,text:'Снимок ещё не отправлен в чат.'};
    const issues: Record<PhotoIssue,string> = {
      occluded:'Не подходит: объект перекрыт, я не могу его рассмотреть. Выбери позицию, откуда он виден без помех.',
      labelCropped:'Не подходит: края таблички обрезаны. Уменьши масштаб или отойди, чтобы обозначение было видно целиком.',
      objectCropped:'Не подходит: объект не помещается в кадр. Для общего вида отойди или уменьши масштаб; для маркировки направь камеру на табличку.',
      unrecognizable:'Не подходит: на снимке не удаётся различить запрошенный объект. Направь камеру на рабочий участок, оборудование или секцию из запроса.',
    };
    if(photo.issue)return {ok:false,text:issues[photo.issue]};
    if(photo.subject==='unknown')return {ok:false,text:issues.unrecognizable};
    const expected:SubjectId=spec.task==='overview'?'workshop':spec.task==='machine'?'m204':'s1';
    if(photo.subject!==expected){
      return {ok:false,text:spec.task==='overview'
        ?'Не подходит: это отдельный объект. Мне нужен общий вид рабочего участка: оборудование и проход между рабочими местами.'
        :`Не подходит: на снимке ${SUBJECT_NAMES[photo.subject]}, а в запросе ${SUBJECT_NAMES[expected]}. Сверь обозначение на месте и сними нужный объект.`};
    }
    if(spec.detail ? !(photo.labelReadable ?? photo.detail) : photo.detail){
      return {ok:false,text:spec.detail
        ?`Не подходит: маркировку ${SUBJECT_NAMES[expected]} на этом кадре нельзя разобрать. Подойди ближе и покажи обозначение целиком.`
        :'Не подходит: кадр слишком крупный: объект нельзя оценить целиком. Отойди и сними общий вид.'};
    }
    return {ok:true,text:spec.task==='overview'
      ?'Подходит: вижу рабочий участок и проход между местами.'
      :spec.detail
        ?`Подходит: маркировка ${SUBJECT_NAMES[expected]} читается.`
        :`Подходит: ${SUBJECT_NAMES[expected]} виден целиком.`};
  }
  attach(task:'machine'|'stock', id:string) {
    if (!this.selectedDocuments.includes(id)) return false;
    this.attachments[task]=id; this.invalidate(task); return true;
  }
  private invalidate(task:TaskId) {this.journalSigned=false;this.accepted=this.accepted.filter(x=>x!==task); if(this.phase==='review')this.phase='call';}
  review(): ReviewIssue[] {
    const issues:ReviewIssue[]=[];
    const check=(task:TaskId, subject:SubjectId, slots:ShotId[])=>{
      let bad = false;
      for(const id of slots) {
        const p=this.photos[id], spec=SHOTS.find(x=>x.id===id)!;
        if(!p?.sent) {issues.push({task,text:`В чате нет материала «${spec.label}». Снимок в галерее ещё не означает отправку.`});bad=true;continue;}
        const feedback=this.photoFeedback(id);
        if(!feedback.ok){issues.push({task,text:feedback.text});bad=true;}
      }
      if(task!=='overview') {
        const doc=DOCUMENTS.find(d=>d.id===this.attachments[task]);
        if(!doc){issues.push({task,text:'В чате нет запрошенного документа.'});bad=true;}
        else if(doc.subject!==subject){issues.push({task,text:'Обозначение в документе не соответствует объекту из запроса. Сверьте номер на месте и в карточке.'});bad=true;}
        else if(!doc.current){issues.push({task,text:'В комплект попала архивная редакция. Проверьте статус документа.'});bad=true;}
      }
      if(!bad) this.accepted.push(task);
    };
    this.accepted=[];
    check('overview','workshop',['overview']);
    check('machine','m204',['machineView','machineLabel']);
    check('stock','s1',['stockView','stockLabel']);
    this.reviewCount++; this.phase=issues.length?'call':'review';
    if(!issues.length&&!this.signatureRequested){
      this.signatureRequested=true;
      this.notice('Все материалы приняты! Теперь осталось подписать журнал мероприятия в Госключе. Открой «Журнал мероприятия» в планшете, проверь результаты и перейди к подписанию.');
    }
    return issues;
  }
  signJournal(){
    if(this.actionIssue()||!this.allMaterialsAccepted||this.journalSigned)return false;
    if(this.review().length)return false;
    this.journalSigned=true;
    this.notice('Журнал подписан. Теперь всё готово! Я жду тебя в комнате подготовки — там, где мы начали.');
    return true;
  }
  finish() {if(this.phase==='review'&&this.accepted.length===3&&this.journalSigned){this.phase='done';return true;}return false;}
}

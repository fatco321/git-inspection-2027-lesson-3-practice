import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {PracticeState,SHOTS,PHOTO_ISSUES} from '../src/practice/PracticeState.ts';
function filled(){const s=new PracticeState();s.phase='call';s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:true};for(const shot of SHOTS){s.putPhoto(shot.id,{subject:shot.task==='overview'?'workshop':shot.task==='machine'?'m204':'s1',detail:shot.detail,sent:false,image:'data:image/jpeg;base64,AA'});s.sendPhoto(shot.id);}s.selectedDocuments=['m204','s1'];s.attach('machine','m204');s.attach('stock','s1');return s;}
test('connection requires organisation, invitation and all permissions',()=>{const s=new PracticeState();assert.ok(s.connect());s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:false};assert.match(s.connect()!,/местоположение/);s.permissions.location=true;assert.equal(s.connect(),undefined);assert.equal(s.phase,'call');});
test('wrong object is accepted as draft but rejected at review',()=>{const s=filled();s.putPhoto('machineLabel',{subject:'m208',detail:true,sent:false,image:'x'});s.sendPhoto('machineLabel');assert.equal(s.phase,'call');assert.equal(s.review().some(x=>x.task==='machine'),true);assert.deepEqual(s.accepted,['overview','stock']);});
test('local photo does not count as sent',()=>{const s=filled();s.photos.stockView!.sent=false;assert.match(s.review().find(x=>x.task==='stock')!.text,/чате/);});
test('archive edition fails even with correct object',()=>{const s=filled();s.selectedDocuments.push('m204-old');s.attach('machine','m204-old');assert.match(s.review().find(x=>x.task==='machine')!.text,/архивная/);assert.equal(s.finish(),false);});
test('a close-up cannot replace a general view',()=>{const s=filled();s.photos.machineView!.detail=true;assert.ok(s.review().some(x=>x.text.includes('слишком крупный')));});
test('corrected submission keeps other evidence and completes',()=>{const s=filled();s.photos.machineView!.subject='m208';s.review();s.photos.machineView!.subject='m204';assert.deepEqual(s.review(),[]);assert.equal(s.reviewCount,2);assert.equal(s.finish(),false);assert.equal(s.signJournal(),true);assert.equal(s.finish(),true);assert.equal(s.phase,'done');});
test('a file cannot be sent without collecting it',()=>{const s=new PracticeState();assert.equal(s.attach('machine','m204'),false);assert.equal(s.attachments.machine,undefined);});

test('chat immediately explains a wrong object and accepts a corrected photo',()=>{
 const s=new PracticeState();s.phase='call';s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:true};
 s.putPhoto('machineLabel',{subject:'m208',detail:true,image:'data:image/jpeg;base64,AA',sent:false});
 assert.equal(s.sendPhoto('machineLabel'),true);
 assert.match(s.photoFeedback('machineLabel').text,/Не подходит:.*ПР-208.*ПР-204/);
 assert.equal(s.photoFeedback('machineLabel').ok,false);
 s.putPhoto('machineLabel',{subject:'m204',detail:true,image:'data:image/jpeg;base64,BB',sent:false});
 assert.equal(s.photos.machineLabel?.sent,false);
 assert.equal(s.sendPhoto('machineLabel'),true);
 assert.equal(s.photoFeedback('machineLabel').ok,true);
 assert.equal(s.photos.machineLabel?.sentOrder,2);
 assert.equal(s.chat.length,2);
 assert.equal(s.chat[0].accepted,false);
 assert.equal(s.chat[1].accepted,true);
});
test('chat distinguishes close-up from full view and blocks sending before connection',()=>{
 const s=new PracticeState();
 s.putPhoto('stockView',{subject:'s1',detail:true,image:'data:image/jpeg;base64,AA',sent:false});
 assert.equal(s.sendPhoto('stockView'),false);
 s.phase='call';s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:true};assert.equal(s.sendPhoto('stockView'),true);
 assert.match(s.photoFeedback('stockView').text,/слишком крупный/);
});

test('any captured frame can be sent, but defects are rejected in chat and review',()=>{
 for(const issue of PHOTO_ISSUES){
  const s=filled();
  s.putPhoto('machineView',{subject:issue==='unrecognizable'?'unknown':'m204',detail:false,issue,image:'data:image/jpeg;base64,AA',sent:false});
  assert.equal(s.sendPhoto('machineView'),true);
  assert.equal(s.photos.machineView?.sent,true);
  const feedback=s.photoFeedback('machineView');
  assert.equal(feedback.ok,false);assert.match(feedback.text,/Не подходит:/);
  assert.equal(s.chat.at(-1)?.response,feedback.text);
  assert.ok(s.review().some(x=>x.task==='machine'&&x.text===feedback.text));
 }
});

test('gallery photo is judged against the selected reply, not the capture request',()=>{
 const s=new PracticeState();s.phase='call';s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:true};
 s.putPhoto('machineLabel',{subject:'m204',detail:false,image:'data:image/jpeg;base64,AA',sent:false});
 assert.equal(s.sendGalleryPhoto(0,'stockView'),true);
 assert.equal(s.photoFeedback('stockView').ok,false);
 assert.equal(s.sendGalleryPhoto(0,'machineView'),true);
 assert.equal(s.photoFeedback('machineView').ok,true);
 assert.equal(s.photoFeedback('machineLabel').ok,false);
 assert.equal(s.sendGalleryPhoto(0,'machineView'),false);
});
test('document attachment is sent with a chosen reply and kept in chat',()=>{
 const s=new PracticeState();s.phase='call';s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:true};s.selectedDocuments=['m204'];
 assert.equal(s.sendDocument('stock','m204'),true);assert.equal(s.chat.at(-1)?.accepted,false);
 assert.equal(s.sendDocument('machine','m204'),true);assert.equal(s.chat.at(-1)?.document,'m204');assert.equal(s.chat.at(-1)?.accepted,true);
});


test('retaking a request replaces its gallery image without rewriting sent chat history',()=>{
 const s=new PracticeState();s.phase='call';s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:true};
 s.putPhoto('machineView',{subject:'m208',detail:false,image:'old',sent:false});
 s.sendGalleryPhoto(0,'machineView');
 s.putPhoto('stockView',{subject:'s1',detail:false,image:'stock',sent:false});
 s.putPhoto('machineView',{subject:'m204',detail:false,image:'new',sent:false});
 assert.equal(s.gallery.length,2);
 assert.equal(s.gallery[0].image,'new');
 assert.equal(s.gallery[1].image,'stock');
 assert.equal(s.chat[0].image,'old');
 assert.equal(s.photos.machineView?.sent,false);
 for(const shot of SHOTS)for(let i=0;i<20;i++)s.putPhoto(shot.id,{subject:'unknown',detail:false,image:String(i),sent:false});
 assert.equal(s.gallery.length,SHOTS.length);
 assert.ok(s.gallery.every(p=>p.image==='19'));
});

test('chat retains only the latest twelve submissions and inspector replies',()=>{
 const s=new PracticeState();s.phase='call';s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:true};
 for(let i=0;i<30;i++){
  s.putPhoto('overview',{subject:'unknown',detail:false,image:String(i),sent:false});
  s.sendGalleryPhoto(0,'overview');
 }
 assert.equal(s.gallery.length,1);
 assert.equal(s.chat.length,12);
 assert.equal(s.chat[0].image,'18');
 assert.equal(s.chat[11].image,'29');
});


test('permission or profile changes require reconnect and preserve accepted evidence',()=>{
 const s=filled();s.review();const photos=JSON.stringify(s.photos),accepted=[...s.accepted];
 s.setPermission('location',false);
 assert.equal(s.actionIssue(true),undefined);
 assert.ok(s.actionIssue());assert.equal(s.sendDocument('machine','m204'),false);
 s.setPermission('location',true);assert.ok(s.actionIssue(true));
 assert.equal(s.connect(),undefined);assert.equal(s.actionIssue(),undefined);
 for(const permission of ['camera','microphone'] as const){
  s.setPermission(permission,false);assert.ok(s.actionIssue(true));assert.ok(s.connect());
  s.setPermission(permission,true);assert.ok(s.actionIssue());s.connect();
 }
 s.setProfile('personal');assert.ok(s.actionIssue(true));assert.ok(s.connect());
 s.setProfile('organisation');assert.ok(s.actionIssue());s.connect();
 assert.equal(s.actionIssue(),undefined);assert.deepEqual(s.accepted,accepted);assert.equal(JSON.stringify(s.photos),photos);
});


test('free camera replaces matching gallery frames without changing accepted evidence',()=>{
 const s=filled();s.review();const accepted=[...s.accepted];const photos=JSON.stringify(s.photos);
 s.capturePhoto({subject:'m204',detail:false,image:'new',sent:false});
 assert.equal(s.gallery.find(p=>p.subject==='m204'&&!p.detail)?.image,'new');
 assert.equal(JSON.stringify(s.photos),photos);assert.deepEqual(s.accepted,accepted);
 for(const subject of ['m208','s2','s3','unknown'] as const)s.capturePhoto({subject,detail:false,image:subject,sent:false});
 assert.ok(s.gallery.length<=5);
});


test('automatic completion requires all five accepted images and both current documents',()=>{
 const s=filled();assert.equal(s.allMaterialsAccepted,true);
 s.photos.stockLabel!.sent=false;assert.equal(s.allMaterialsAccepted,false);
 s.photos.stockLabel!.sent=true;s.attachments.stock='s1-old';assert.equal(s.allMaterialsAccepted,false);
 s.attachments.stock='s1';assert.equal(s.allMaterialsAccepted,true);
});

test('readable shelf label does not invalidate a complete shelf photo',()=>{
 const s=filled();
 for(const id of ['stockView','stockLabel'] as const){
  s.putPhoto(id,{subject:'s1',detail:false,labelReadable:true,image:'x',sent:false});
  s.sendPhoto(id);assert.equal(s.photoFeedback(id).ok,true);
 }
 s.putPhoto('stockLabel',{subject:'s1',detail:false,labelReadable:false,image:'x',sent:false});
 s.sendPhoto('stockLabel');assert.equal(s.photoFeedback('stockLabel').ok,false);
});

test('route is a complete permutation and survives reconnection',()=>{
 const s=new PracticeState();s.profile='organisation';s.confirmed=true;s.permissions={camera:true,microphone:true,location:true};
 s.connect();assert.deepEqual([...s.route].sort(),['machine','overview','stock']);const route=[...s.route];
 s.setPermission('camera',false);s.setPermission('camera',true);s.connect();assert.deepEqual(s.route,route);
});
test('route blocks early documents and photos; current object needs its document',()=>{
 const s=new PracticeState();s.phase='call';s.profile='organisation';s.permissions={camera:true,microphone:true,location:true};
 s.route=['machine','stock','overview'];s.selectedDocuments=['m204','s1','m204-old'];
 s.sendDocument('stock','s1');assert.equal(s.attachments.stock,undefined);assert.match(s.chat.at(-1)!.response,/ещё не закончили/);
 s.capturePhoto({subject:'s1',detail:false,sent:false,image:'x'});s.sendGalleryPhoto(0,'stockView');assert.equal(s.photos.stockView,undefined);
 for(const id of ['machineView','machineLabel'] as const){s.putPhoto(id,{subject:'m204',detail:id==='machineLabel',sent:false,image:'x'});s.sendPhoto(id);}
 assert.equal(s.currentTask,'machine');
 s.sendDocument('machine','m204-old');assert.equal(s.currentTask,'machine');
 s.sendDocument('machine','m204');assert.equal(s.currentTask,'stock');
 assert.match(s.chat.at(-1)!.response,/Секция хранения/);
});

test('journal signing requires all accepted materials and working connection',()=>{
 const empty=new PracticeState();assert.equal(empty.signJournal(),false);assert.equal(empty.finish(),false);
 const s=filled();s.review();assert.equal(s.finish(),false);
 s.setPermission('camera',false);assert.equal(s.signJournal(),false);
 s.setPermission('camera',true);s.connect();assert.equal(s.signJournal(),true);
 assert.equal(s.signJournal(),false);assert.equal(s.finish(),true);
});

import {sequence,stageTitles,type Stage} from './courseSequence';
import './courseAccess.css';
/** Guard before importing the scene. Works in embeds, direct links and local builds. */
export function mountCourseAccess(stage:Stage,start:()=>Promise<unknown>){
 const panel=document.createElement('section');panel.className='course-access';panel.setAttribute('role','status');
 const card=document.createElement('div'),title=document.createElement('h1'),text=document.createElement('p'),retry=document.createElement('button');
 title.textContent='Продолжите путешествие по порядку';retry.textContent='Проверить прохождение';card.append(title,text,retry);panel.append(card);
 let started=false,disposed=false;
 const check=()=>{
  if(disposed)return;
  const missing=sequence.missing(stage);
  if(missing){
   if(started){location.reload();return;}
   text.textContent=`Сначала завершите ${stageTitles[missing]}, затем вернитесь сюда.`;
   if(!panel.isConnected)document.body.append(panel);
   return;
  }
  panel.remove();
  if(started)return;
  started=true;
  void start().catch(error=>{
   if(disposed)return;console.error(error);title.textContent='Не удалось загрузить игру';text.textContent='Обновите страницу, чтобы попробовать снова.';retry.textContent='Обновить';retry.onclick=()=>location.reload();document.body.append(panel);
  });
 };
 const storage=(event:StorageEvent)=>{if(event.key===null||event.key.startsWith('git-inspection-2027:'))check();};
 const visibility=()=>{if(!document.hidden)check();};
 retry.onclick=check;window.addEventListener('storage',storage);window.addEventListener('focus',check);document.addEventListener('visibilitychange',visibility);check();
 return ()=>{disposed=true;panel.remove();window.removeEventListener('storage',storage);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',visibility);};
}

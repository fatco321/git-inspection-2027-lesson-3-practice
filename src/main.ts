import {mountCourseAccess} from './progress/courseAccess';
import {sequence} from './progress/courseSequence';
const initialLoading=document.getElementById('game-loading');
if(initialLoading)initialLoading.hidden=!sequence.canStart('lesson-3-practice');
let disposed=false;
let fadeTimer:ReturnType<typeof setTimeout>|undefined;
const dispose=mountCourseAccess('lesson-3-practice',async()=>{
 const loading=document.getElementById('game-loading');
 if(loading)loading.hidden=false;
 try{
  const game=await import('./bootstrap');
  await game.ready;
  if(disposed)return;
  loading?.setAttribute('aria-busy','false');
  loading?.classList.add('leaving');
  fadeTimer=setTimeout(()=>loading?.remove(),400);
 }catch(error){
  if(disposed)return;
  console.error(error);
  if(!loading)throw error;
  loading.querySelector('p')!.textContent='Не удалось загрузить игру. Проверьте соединение и попробуйте снова.';
  loading.querySelector<HTMLElement>('.loading-ring')!.hidden=true;
  loading.querySelector<HTMLButtonElement>('button')!.hidden=false;
  loading.setAttribute('aria-busy','false');
 }
});
if(import.meta.hot)import.meta.hot.dispose(()=>{disposed=true;clearTimeout(fadeTimer);dispose();});

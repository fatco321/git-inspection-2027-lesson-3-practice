import {sequence,type Stage} from './courseSequence';
import './courseAccess.css';
/** Called only from the final screen; never from disposal or scene loading. */
export function saveCompletion(stage:Stage,parent:HTMLElement):boolean{
 if(sequence.complete(stage))return true;
 if(parent.querySelector('.course-save-retry'))return false;
 const box=document.createElement('div');box.className='course-save-retry';
 const text=document.createElement('p'),retry=document.createElement('button');
 text.textContent='Не удалось сохранить прохождение. Разрешите хранение данных сайта и попробуйте снова.';
 retry.textContent='Сохранить прохождение';retry.onclick=()=>{if(sequence.complete(stage))box.remove();};
 box.append(text,retry);parent.append(box);return false;
}

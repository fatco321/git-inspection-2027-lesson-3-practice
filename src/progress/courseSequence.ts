/** Identical contract in all six independently deployed projects. Keep copies in sync. */
export const stages = ['lesson-1-prologue','lesson-1-practice','lesson-2-prologue','lesson-2-practice','lesson-3-prologue','lesson-3-practice'] as const;
export type Stage = typeof stages[number];
export const stageTitles: Record<Stage,string> = {
 'lesson-1-prologue':'пролог первого урока','lesson-1-practice':'практику первого урока',
 'lesson-2-prologue':'пролог второго урока','lesson-2-practice':'практику второго урока',
 'lesson-3-prologue':'пролог третьего урока','lesson-3-practice':'практику третьего урока',
};
export const stageKey = (stage: Stage) => stage==='lesson-1-prologue'?'git-inspection-2027:progress':`git-inspection-2027:${stage}`;
type Store = Pick<Storage,'getItem'|'setItem'>;
export function createSequence(getStorage:()=>Store=()=>window.localStorage){
 const completed=(stage:Stage):boolean=>{
  try {
   const value=JSON.parse(getStorage().getItem(stageKey(stage))??'null');
   const date=stage==='lesson-1-prologue'?value?.prologueCompletedAt:value?.completedAt;
   return value?.version===1&&typeof date==='string'&&Number.isFinite(Date.parse(date));
  } catch {return false;}
 };
 const missing=(stage:Stage):Stage|undefined=>stages.slice(0,stages.indexOf(stage)).find(previous=>!completed(previous));
 const canStart=(stage:Stage)=>missing(stage)===undefined;
 const complete=(stage:Stage):boolean=>{
  if(!canStart(stage))return false;
  if(completed(stage))return true;
  try {
   const date=new Date().toISOString();
   getStorage().setItem(stageKey(stage),JSON.stringify(stage==='lesson-1-prologue'?{version:1,prologueCompletedAt:date}:{version:1,completedAt:date}));
   return completed(stage);
  } catch {return false;}
 };
 return {completed,missing,canStart,complete};
}
export const sequence=createSequence();

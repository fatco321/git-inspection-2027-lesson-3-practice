import {mountCourseAccess} from './progress/courseAccess';
const dispose=mountCourseAccess('lesson-3-practice',()=>import('./bootstrap'));
if(import.meta.hot)import.meta.hot.dispose(dispose);

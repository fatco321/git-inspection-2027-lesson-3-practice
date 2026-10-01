import './style.css';
import { PracticeGame } from './game/PracticeGame';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const game = new PracticeGame(canvas);
if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());

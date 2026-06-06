import './style.css';
import { GameApp } from './app/GameApp';

const appEl = document.querySelector<HTMLDivElement>('#app');
if (!appEl) throw new Error('#app not found');

new GameApp(appEl);

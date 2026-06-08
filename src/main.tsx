import './ui/tokens.css';
import './style.css';
import { render } from 'solid-js/web';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');

render(() => <App />, root);

// PWA: 新バージョンを自動適用（オフライン対応）。
registerSW({ immediate: true });

import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './style.css';
import App from './App.vue';
import { Cropper } from 'vue-advanced-cropper';

// Set document.title with version from Vite define
if (typeof __APP_VERSION__ !== 'undefined') {
  document.title = `Sazan ImageKit v${__APP_VERSION__}`;
}

const app = createApp(App);
app.use(ElementPlus);
app.component('Cropper', Cropper);
app.mount('#app');

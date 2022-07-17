import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCN from 'element-plus/es/locale/lang/zh-cn';
import App from './App.vue';
import router from './router';
import store from './store';
import './assets/sass/index.sass';

createApp(App)
  .use(store)
  .use(router)
  .use(ElementPlus, {
    locale: zhCN,
  })
  .mount('#app');

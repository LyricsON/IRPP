import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@vuepic/vue-datepicker/dist/main.css';
import App from './App.vue';
import './styles.css';

createApp(App).use(createPinia()).mount('#app');

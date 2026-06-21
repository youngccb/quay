import { createApp } from 'vue'
import './style.css'
import setupDisableDevtools from './utils/disable-devtools'
import App from './App.vue'
// import router from './router'


createApp(App).mount('#app')

// setupDisableDevtools({
//     enableDetector: true,
// })
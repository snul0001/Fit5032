import { createApp } from 'vue';
import App from './App.vue';
import router from './router';


import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';





// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCK2ny8l7EXD15KkFMb0UKrggNlxwHwxDo",
  authDomain: "week7-sriadityanulu.firebaseapp.com",
  projectId: "week7-sriadityanulu",
  storageBucket: "week7-sriadityanulu.firebasestorage.app",
  messagingSenderId: "970607199582",
  appId: "1:970607199582:web:d4bab620bdeef7f1bfbbcf"
};

// Initialize Firebase
initializeApp(firebaseConfig);


// ...your existing imports and initializeApp(...)
const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue error]', err, info)
}
app.use(router).mount('#app')



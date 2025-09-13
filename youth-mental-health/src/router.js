import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/HomeView.vue';
import Resources from './views/ResourcesList.vue';
import ResourceDetail from './views/ResourceDetail.vue';
import GetHelp from './views/GetHelpView.vue';
import Contact from './views/ContactView.vue';
import FirebaseSigninView from './views/FirebaseSigninView.vue'
import FirebaseRegisterView from './views/FirebaseRegisterView.vue'



export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/resources', component: Resources },
    { path: '/resources/:id', component: ResourceDetail, props: true },
    { path: '/get-help', component: GetHelp },
    { path: '/contact', component: Contact },
    { path: '/firebase-signin', name: 'firebase-signin', component: FirebaseSigninView },
    { path: '/firebase-register', name: 'firebase-register', component: FirebaseRegisterView },
  ],
  scrollBehavior: () => ({ top: 0 })
});

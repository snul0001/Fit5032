import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/HomeView.vue';
import Resources from './views/ResourcesList.vue';
import ResourceDetail from './views/ResourceDetail.vue';
import GetHelp from './views/GetHelpView.vue';
import Contact from './views/ContactView.vue';
import FirebaseSigninView from './views/FirebaseSigninView.vue'
import FirebaseRegisterView from './views/FirebaseRegisterView.vue'
import AdminDashboard from './views/AdminDashboard.vue'
import ResourceNew from './views/ResourceNew.vue'
import ResourceEdit from './views/ResourceEdit.vue'

import SeedResources from './views/SeedResources.vue'


import EmailCompose from './views/EmailCompose.vue'

import AdminResourcesTable from './views/AdminResourcesTable.vue'
import AdminUsersTable from './views/AdminUsersTable.vue'






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
    { path: '/admin', name: 'admin', component: AdminDashboard },
    { path: '/resources/new', name: 'resource-new', component: ResourceNew },
    { path: '/resources/:id/edit', name: 'resource-edit', component: ResourceEdit, props: true },
    { path: '/admin/seed', name: 'admin-seed', component: SeedResources },
    { path: '/admin/email', name: 'admin-email', component: EmailCompose, meta: { requiresAdmin: true } },
    { path: '/admin/resources-table', name: 'admin-resources-table', component: AdminResourcesTable, meta: { requiresAdmin: true } },
    { path: '/admin/users',          name: 'admin-users',           component: AdminUsersTable,    meta: { requiresAdmin: true } },
  ],
  scrollBehavior: () => ({ top: 0 })
});

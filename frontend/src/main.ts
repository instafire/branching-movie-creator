import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import App from './App.vue'

import ProjectList from './views/ProjectList.vue'
import ProjectEditor from './views/ProjectEditor.vue'
import ProjectViewer from './views/ProjectViewer.vue'
import PublishedFeed from './views/PublishedFeed.vue'
import PublishedMovie from './views/PublishedMovie.vue'
import Login from './views/Login.vue'
import { useAuthStore } from './stores/authStore'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/projects' },
  { path: '/feed', component: PublishedFeed, meta: { layout: 'feed' } },
  { path: '/movies/:id', component: PublishedMovie, meta: { layout: 'feed' } },
  { path: '/login', component: Login, meta: { guestOnly: true } },
  { path: '/projects', component: ProjectList, meta: { requiresAuth: true, layout: 'workspace' } },
  { path: '/projects/:id/edit', component: ProjectEditor, meta: { requiresAuth: true, layout: 'workspace' } },
  { path: '/projects/:id/view', component: ProjectViewer, meta: { requiresAuth: true, layout: 'workspace' } },
  { path: '/projects/:id/analytics', component: () => import('./views/AnalyticsDashboard.vue'), meta: { requiresAuth: true, layout: 'workspace' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const pinia = createPinia()

async function bootstrap() {
  const authStore = useAuthStore(pinia)

  if (authStore.token) {
    await authStore.fetchUser()
  }

  router.beforeEach((to) => {
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return '/login'
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return '/projects'
    }

    return true
  })

  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.mount('#app')
}

void bootstrap()

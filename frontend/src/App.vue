<template>
  <div id="app">
    <header v-if="showWorkspaceChrome" class="app-header">
      <nav>
        <router-link to="/projects" class="logo">
          <span class="logo-mark">BM</span>
          <span>BranchMovie</span>
        </router-link>

        <div class="nav-links">
          <router-link to="/projects">Projects</router-link>
          <router-link to="/feed">Feed</router-link>
          <div class="user-menu">
            <button class="user-avatar" @click="showUserDropdown = !showUserDropdown">
              {{ userInitials }}
            </button>
            <Transition name="dropdown">
              <div v-if="showUserDropdown" class="user-dropdown" @click="showUserDropdown = false">
                <span class="dropdown-email">{{ userEmail }}</span>
                <button class="dropdown-item" @click="logout">Logout</button>
              </div>
            </Transition>
          </div>
        </div>
      </nav>
    </header>

    <main class="app-main" :class="{ 'app-main-feed': isFeedLayout }">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ToastContainer from './components/ToastContainer.vue'
import { useAuthStore } from './stores/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const showUserDropdown = ref(false)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isFeedLayout = computed(() => route.meta.layout === 'feed')
const showWorkspaceChrome = computed(() => isAuthenticated.value && !isFeedLayout.value)
const userEmail = computed(() => authStore.user?.email || '')
const userInitials = computed(() => {
  const name = authStore.user?.username || authStore.user?.email || '?'
  return name.slice(0, 2).toUpperCase()
})

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Audiowide&family=Syne:wght@500;700;800&display=swap');

:root {
  color-scheme: dark;
  --app-header-height: 62px;
  --bg: #020617;
  --panel: #111827;
  --panel-raised: #162033;
  --panel-border: #243145;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --brand: #38bdf8;
  --brand-strong: #0ea5e9;
  --danger: #ef4444;
  --scrollbar-track: rgba(15, 23, 42, 0.72);
  --scrollbar-thumb: rgba(56, 189, 248, 0.34);
  --scrollbar-thumb-hover: rgba(103, 232, 249, 0.46);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  min-height: 100%;
}

html {
  height: 100%;
  scrollbar-gutter: stable both-edges;
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}

*::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

*::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 999px;
}

*::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border: 3px solid var(--scrollbar-track);
  border-radius: 999px;
}

*::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

*::-webkit-scrollbar-corner {
  background: transparent;
}

body {
  min-height: 100dvh;
  font-family: 'Syne', 'Segoe UI', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  background:
    radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 32%),
    linear-gradient(180deg, #08111f 0%, var(--bg) 42%);
  color: var(--text);
  overflow-x: hidden;
  overflow-y: auto;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(180deg, rgba(255, 255, 255, 0.55), transparent 70%);
  pointer-events: none;
}

a {
  color: inherit;
}

a,
button,
input,
textarea,
select,
[tabindex]:not([tabindex="-1"]) {
  outline: none;
}

a:focus-visible,
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
[tabindex]:not([tabindex="-1"]):focus-visible {
  box-shadow: 0 0 0 3px rgba(103, 232, 249, 0.18), 0 0 0 1px rgba(103, 232, 249, 0.75);
}

button,
input,
textarea,
select {
  font: inherit;
}

#app {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0 24px;
  backdrop-filter: blur(18px);
  background: rgba(2, 6, 23, 0.68);
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.app-header nav {
  max-width: 1440px;
  margin: 0 auto;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
}

.logo-mark {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  color: #00111a;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 22px;
}

.nav-links a {
  position: relative;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
  padding-bottom: 4px;
}

.nav-links a::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  background: var(--brand);
  border-radius: 999px;
  transform: scaleX(0);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nav-links a:hover {
  color: var(--text);
}

.nav-links a.router-link-active {
  color: var(--text);
}

.nav-links a.router-link-active::after {
  transform: scaleX(1);
}

.user-menu {
  position: relative;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  color: #00111a;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.user-avatar:hover {
  transform: scale(1.08);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(18px);
  z-index: 200;
}

.dropdown-email {
  display: block;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-muted);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.dropdown-item:hover {
  background: rgba(148, 163, 184, 0.1);
}

.app-main {
  flex: 1;
  width: 100%;
  padding: 24px;
}

.app-main-feed {
  max-width: none;
  margin: 0;
  padding: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-primary {
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  color: #03111b;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #67e8f9, var(--brand));
}

.btn-secondary {
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.12);
  color: var(--text);
}

.btn-secondary:hover {
  background: #243145;
}

.btn-danger {
  background: rgba(127, 29, 29, 0.92);
  color: #fee2e2;
}

.btn-danger:hover {
  background: rgba(153, 27, 27, 0.96);
}

input,
textarea,
select {
  width: 100%;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: var(--text);
  padding: 10px 14px;
  border-radius: 12px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.65);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.14);
}

label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
}

.form-group {
  margin-bottom: 16px;
}

@media (max-width: 720px) {
  :root {
    --app-header-height: 58px;
  }

  .app-header,
  .app-main {
    padding-left: 16px;
    padding-right: 16px;
  }

  .app-header nav {
    height: 58px;
  }

  .logo span:last-child {
    display: none;
  }

  .nav-links {
    gap: 14px;
  }
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.dropdown-enter-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.95);
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

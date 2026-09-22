<template>
  <div id="app">
    <header v-if="showWorkspaceChrome" class="app-header">
      <nav>
        <router-link to="/projects" class="logo">
          <span class="logo-mark">IM</span>
          <span>IM</span>
        </router-link>

        <div class="nav-links">
          <router-link to="/projects">Projects</router-link>
          <button class="logout-btn" @click="logout">Logout</button>
        </div>
      </nav>
    </header>

    <main class="app-main" :class="{ 'app-main-feed': isFeedLayout }">
      <router-view />
    </main>

    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ToastContainer from './components/ToastContainer.vue'
import { useAuthStore } from './stores/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isFeedLayout = computed(() => route.meta.layout === 'feed')
const showWorkspaceChrome = computed(() => isAuthenticated.value && !isFeedLayout.value)

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
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: var(--text);
}

.logout-btn {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: var(--text-muted);
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.logout-btn:hover {
  color: var(--text);
  background: rgba(148, 163, 184, 0.08);
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
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

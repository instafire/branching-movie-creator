<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand-mark">
        <span class="brand-icon">BM</span>
      </div>
      <h1>Branching Movie Creator</h1>
      <p class="subtitle">Create interactive stories with Live Photos</p>

      <div class="tab-control">
        <div class="tab-indicator" :class="{ right: mode === 'register' }" />
        <button
          class="tab-btn"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'"
        >
          Login
        </button>
        <button
          class="tab-btn"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
        >
          Register
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <Transition name="field-slide" mode="out-in">
          <div v-if="mode === 'register'" key="username" class="form-group">
            <label>Username</label>
            <input
              v-model="username"
              type="text"
              placeholder="Choose a username"
              required
            />
          </div>
        </Transition>

        <div class="form-group">
          <label>Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="Enter your email"
            required
          />
        </div>

        <div class="form-group">
          <label>Password</label>
          <div class="password-field">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              class="password-toggle"
              tabindex="-1"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <Transition name="fade-fast">
          <div v-if="error" class="error-message">{{ error }}</div>
        </Transition>

        <button type="submit" class="btn btn-primary submit-btn" :disabled="isLoading">
          <span v-if="isLoading" class="btn-spinner" />
          <span v-else>{{ mode === 'login' ? 'Login' : 'Create Account' }}</span>
        </button>
      </form>

      <div class="feed-link-container">
        <router-link to="/feed" class="feed-link">
          ← Explore Published Movies
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const username = ref('')
const error = ref('')
const isLoading = ref(false)
const showPassword = ref(false)

async function handleSubmit() {
  error.value = ''
  isLoading.value = true

  try {
    if (mode.value === 'login') {
      await authStore.login(email.value, password.value)
    } else {
      await authStore.register(email.value, password.value, username.value)
    }
    router.push('/projects')
  } catch (e: any) {
    error.value = e.response?.data?.error || 'An error occurred'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100dvh - 80px);
  padding: 24px;
}

.login-card {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow:
    0 25px 60px -12px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
}

.brand-mark {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.brand-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  color: #00111a;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.login-card h1 {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 6px;
}

.subtitle {
  text-align: center;
  color: #94a3b8;
  margin-bottom: 28px;
  font-size: 14px;
}

.tab-control {
  position: relative;
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  padding: 4px;
  background: rgba(2, 6, 23, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 14px;
}

.tab-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 10px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.tab-indicator.right {
  transform: translateX(100%);
}

.tab-btn {
  flex: 1;
  position: relative;
  z-index: 1;
  padding: 10px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: color 0.25s ease;
}

.tab-btn.active {
  color: #bae6fd;
}

.tab-btn:hover:not(.active) {
  color: #94a3b8;
}

.password-field {
  position: relative;
}

.password-field input {
  padding-right: 42px;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color 0.2s ease;
}

.password-toggle:hover {
  color: #bae6fd;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
  min-height: 44px;
  position: relative;
}

.btn-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #03111b;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background: rgba(127, 29, 29, 0.72);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fecaca;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 13px;
}

.field-slide-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.field-slide-leave-active {
  transition: all 0.15s ease-in;
}

.field-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}

.field-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

.feed-link-container {
  margin-top: 24px;
  text-align: center;
}

.feed-link {
  color: #94a3b8;
  font-size: 13px;
  text-decoration: none;
  transition: color 0.2s ease;
}

.feed-link:hover {
  color: var(--brand);
}

@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px;
    border-radius: 20px;
  }
}
</style>

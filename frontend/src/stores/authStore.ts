import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, setAccessToken } from '../api/client'

interface User {
  id: string
  email: string
  username: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const isBootstrapped = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  if (token.value) {
    setAccessToken(token.value)
  }

  async function login(email: string, password: string) {
    const response = await authApi.login({ email, password })
    const { user: userData, token: newToken } = response.data

    token.value = newToken
    user.value = userData
    localStorage.setItem('token', newToken)
    setAccessToken(newToken)
  }

  async function register(email: string, password: string, username: string) {
    const response = await authApi.register({ email, password, username })
    const { user: userData, token: newToken } = response.data

    token.value = newToken
    user.value = userData
    localStorage.setItem('token', newToken)
    setAccessToken(newToken)
  }

  async function fetchUser() {
    if (!token.value) return

    try {
      const response = await authApi.me()
      user.value = response.data
    } catch (error) {
      logout()
    }
  }

  async function bootstrap() {
    if (isBootstrapped.value) return

    if (token.value) {
      await fetchUser()
    }

    isBootstrapped.value = true
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    setAccessToken(null)
  }

  return {
    user,
    token,
    isAuthenticated,
    isBootstrapped,
    login,
    register,
    fetchUser,
    bootstrap,
    logout,
  }
})

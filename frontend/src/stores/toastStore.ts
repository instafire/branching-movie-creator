import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  durationMs: number
}

let toastCounter = 0

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function show(message: string, type: Toast['type'] = 'info', durationMs = 3000) {
    const id = `toast-${++toastCounter}-${Date.now()}`
    const toast: Toast = { id, message, type, durationMs }

    toasts.value.push(toast)

    if (durationMs > 0) {
      setTimeout(() => dismiss(id), durationMs)
    }

    return id
  }

  function success(message: string, durationMs = 3000) {
    return show(message, 'success', durationMs)
  }

  function error(message: string, durationMs = 4000) {
    return show(message, 'error', durationMs)
  }

  function info(message: string, durationMs = 3000) {
    return show(message, 'info', durationMs)
  }

  function dismiss(id: string) {
    const index = toasts.value.findIndex((t) => t.id === id)

    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return { toasts, show, success, error, info, dismiss }
})

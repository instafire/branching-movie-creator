<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast-${toast.type}`"
          role="alert"
          @click="dismiss(toast.id)"
        >
          <svg v-if="toast.type === 'success'" class="toast-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
          </svg>
          <svg v-else-if="toast.type === 'error'" class="toast-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
          </svg>
          <svg v-else class="toast-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>
          </svg>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToastStore } from '../stores/toastStore'

const toastStore = useToastStore()
const toasts = computed(() => toastStore.toasts)

function dismiss(id: string) {
  toastStore.dismiss(id)
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: min(420px, calc(100vw - 40px));
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 14px;
  backdrop-filter: blur(18px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  cursor: pointer;
  pointer-events: auto;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.toast-success {
  background: rgba(5, 46, 22, 0.88);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #bbf7d0;
}

.toast-success .toast-icon {
  color: #4ade80;
}

.toast-error {
  background: rgba(69, 10, 10, 0.88);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fecaca;
}

.toast-error .toast-icon {
  color: #f87171;
}

.toast-info {
  background: rgba(7, 30, 52, 0.88);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #bae6fd;
}

.toast-info .toast-icon {
  color: #38bdf8;
}

.toast-icon {
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  min-width: 0;
}

.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-leave-active {
  transition: all 0.25s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(80px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(80px) scale(0.9);
}

.toast-move {
  transition: transform 0.25s ease;
}

@media (max-width: 640px) {
  .toast-container {
    top: 12px;
    right: 12px;
    left: 12px;
    max-width: none;
  }
}
</style>

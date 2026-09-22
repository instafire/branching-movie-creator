<template>
  <div class="player-controls">
    <div class="progress-container" @click="handleSeek">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }" />
        <div
          v-for="choice in choices"
          :key="choice.id"
          class="progress-marker"
          :style="{ left: `${getMarkerPosition(choice)}%` }"
        />
      </div>
    </div>

    <div class="controls-row">
      <button class="control-button" @click="togglePlay">
        <svg v-if="isPlaying" viewBox="0 0 24 24" width="24" height="24">
          <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
          <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="24" height="24">
          <polygon points="5,3 19,12 5,21" fill="currentColor"/>
        </svg>
      </button>

      <button class="control-button" @click="$emit('restart')">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6a6 6 0 0 1-6 6 6 6 0 0 1-5.65-4H4.26A8 8 0 0 0 12 21a8 8 0 0 0 0-16z" fill="currentColor"/>
        </svg>
      </button>

      <div class="time-display">
        <span>{{ formatTime(currentTime) }}</span>
        <span class="separator">/</span>
        <span>{{ formatTime(duration) }}</span>
      </div>

      <button class="control-button" @click="$emit('fullscreen')">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { Edge } from '../../stores/graphStore'

const props = defineProps<{
  currentTime: number
  duration: number
  isPlaying: boolean
  choices?: Edge[]
}>()

const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pause'): void
  (e: 'restart'): void
  (e: 'seek', timeMs: number): void
  (e: 'fullscreen'): void
}>()

const progressPercent = computed(() => {
  if (props.duration <= 0) {
    return 0
  }

  return Math.min((props.currentTime / props.duration) * 100, 100)
})

function togglePlay() {
  if (props.isPlaying) {
    emit('pause')
  } else {
    emit('play')
  }
}

function handleSeek(event: MouseEvent) {
  const target = event.currentTarget as HTMLDivElement
  const rect = target.getBoundingClientRect()
  const percent = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
  emit('seek', percent * props.duration)
}

function getMarkerPosition(choice: Edge): number {
  if ((choice.trigger_at_ms ?? 0) <= 0) {
    return props.duration > 0 ? 100 : 0
  }

  return props.duration > 0
    ? Math.min(((choice.trigger_at_ms ?? 0) / props.duration) * 100, 100)
    : 0
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.player-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 18px;
  background: linear-gradient(transparent, rgba(2, 6, 23, 0.86));
}

.progress-container {
  cursor: pointer;
  padding: 8px 0;
}

.progress-track {
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #0ea5e9);
  border-radius: 999px;
  transition: width 0.1s linear;
}

.progress-marker {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  background: #f59e0b;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 3px rgba(2, 6, 23, 0.35);
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: white;
  border-radius: 999px;
  cursor: pointer;
}

.control-button:hover {
  background: rgba(30, 41, 59, 0.92);
}

.time-display {
  font-size: 14px;
  color: white;
  font-variant-numeric: tabular-nums;
}

.separator {
  margin: 0 4px;
  opacity: 0.55;
}
</style>

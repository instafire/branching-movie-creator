<template>
  <div class="choice-overlay">
    <div class="dimmer" />
    <div class="choice-panel">
      <div class="choices-container">
        <button
          v-for="choice in choices"
          :key="choice.id"
          class="choice-button"
          :class="{ disabled: disabled }"
          :disabled="disabled"
          @mouseenter="startPreview(choice)"
          @mouseleave="stopPreview(choice)"
          @focus="startPreview(choice)"
          @blur="stopPreview(choice)"
          @click="handleSelect(choice)"
        >
          <div class="choice-thumbnail">
            <video
              v-if="choice.target_node?.media_clip?.stream_url"
              :ref="getPreviewVideoRef(choice.id)"
              class="choice-preview-video"
              :class="{ active: activePreviewId === choice.id }"
              :src="choice.target_node.media_clip.stream_url"
              muted
              loop
              playsinline
              preload="metadata"
            />
            <img
              v-if="choice.target_node?.media_clip?.thumbnail_url"
              class="choice-poster"
              :class="{ 'is-hidden': activePreviewId === choice.id }"
              :src="choice.target_node.media_clip.thumbnail_url"
              :alt="choiceLabel(choice)"
            />
            <div
              v-else
              class="choice-placeholder"
              :class="{ 'is-hidden': activePreviewId === choice.id }"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" width="34" height="34">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
              </svg>
            </div>
            <div class="choice-shade" />
            <div class="choice-copy">
              <span class="choice-label">{{ choiceLabel(choice) }}</span>
            </div>
          </div>
        </button>
      </div>
      <div v-if="choices.length === 0" class="no-choices">
        <p>The story ends here.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type ComponentPublicInstance } from 'vue'

import type { Edge, Node } from '../../stores/graphStore'

type ChoiceOverlayChoice = Edge & {
  target_node?: Node
}

const props = defineProps<{
  choices: ChoiceOverlayChoice[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', edge: Edge): void
}>()

const previewVideos = new Map<string, HTMLVideoElement>()
const activePreviewId = ref<string | null>(null)

function choiceLabel(choice: ChoiceOverlayChoice) {
  return choice.choice_label || choice.target_node?.label || 'Continue'
}

function setPreviewVideo(id: string, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLVideoElement) {
    previewVideos.set(id, element)
    return
  }

  previewVideos.delete(id)
}

function getPreviewVideoRef(id: string) {
  return (element: Element | ComponentPublicInstance | null) => {
    setPreviewVideo(id, element)
  }
}

function stopPreviewById(id: string) {
  const previewVideo = previewVideos.get(id)

  if (!previewVideo) {
    return
  }

  previewVideo.pause()
  previewVideo.currentTime = 0
}

async function startPreview(choice: ChoiceOverlayChoice) {
  if (props.disabled || !choice.target_node?.media_clip?.stream_url) {
    return
  }

  if (activePreviewId.value && activePreviewId.value !== choice.id) {
    stopPreviewById(activePreviewId.value)
  }

  const previewVideo = previewVideos.get(choice.id)

  if (!previewVideo) {
    return
  }

  previewVideo.currentTime = 0

  try {
    await previewVideo.play()
    activePreviewId.value = choice.id
  } catch {
    activePreviewId.value = null
  }
}

function stopPreview(choice: ChoiceOverlayChoice) {
  stopPreviewById(choice.id)

  if (activePreviewId.value === choice.id) {
    activePreviewId.value = null
  }
}

function handleSelect(edge: ChoiceOverlayChoice) {
  if (!props.disabled) {
    emit('select', edge)
  }
}
</script>

<style scoped>
.choice-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.dimmer {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.choice-panel {
  position: relative;
  z-index: 1;
  width: min(620px, calc(100% - 40px));
  padding: 24px;
}

.choices-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 18px;
}

.choice-button {
  width: 152px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  text-align: center;
  transition: transform 0.25s ease, filter 0.25s ease;
}

.choice-button:hover:not(.disabled) {
  transform: translateY(-4px) scale(1.02);
  filter: drop-shadow(0 0 18px rgba(255, 42, 76, 0.4));
}

.choice-button:active:not(.disabled) {
  transform: translateY(-1px);
}

.choice-button:focus-visible {
  outline: none;
}

.choice-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.choice-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 20px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.78)),
    #0f172a;
  border: 1px solid rgba(255, 77, 109, 0.92);
  box-shadow:
    0 0 0 1px rgba(255, 77, 109, 0.5),
    0 0 16px rgba(255, 42, 76, 0.38),
    0 0 34px rgba(255, 12, 57, 0.24),
    inset 0 0 20px rgba(255, 61, 93, 0.12);
}

.choice-poster,
.choice-preview-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.choice-poster {
  z-index: 1;
  transition: opacity 0.25s ease, transform 0.35s ease;
}

.choice-poster.is-hidden,
.choice-placeholder.is-hidden {
  opacity: 0;
}

.choice-preview-video {
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.choice-preview-video.active {
  opacity: 1;
}

.choice-button:hover:not(.disabled) .choice-poster,
.choice-button:focus-visible .choice-poster {
  transform: scale(1.03);
}

.choice-button:hover:not(.disabled) .choice-thumbnail,
.choice-button:focus-visible .choice-thumbnail {
  box-shadow:
    0 0 0 1px rgba(255, 96, 122, 0.65),
    0 0 20px rgba(255, 52, 87, 0.52),
    0 0 40px rgba(255, 15, 59, 0.34),
    inset 0 0 24px rgba(255, 61, 93, 0.16);
}

.choice-placeholder {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.38);
  background:
    radial-gradient(circle at top, rgba(56, 189, 248, 0.18), transparent 45%),
    #0f172a;
}

.choice-shade {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.02) 36%, rgba(2, 6, 23, 0.82) 100%);
  pointer-events: none;
}

.choice-copy {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 9px;
  z-index: 4;
  display: flex;
  justify-content: center;
  text-align: center;
}

.choice-label {
  font-family: 'Audiowide', 'Syne', sans-serif;
  font-size: 0.64rem;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fff1f2;
  text-shadow:
    0 0 8px rgba(255, 112, 133, 0.65),
    0 2px 10px rgba(0, 0, 0, 0.55);
  line-height: 1.15;
}

.no-choices {
  color: white;
  padding: 32px;
}

@media (max-width: 640px) {
  .choice-panel {
    width: calc(100% - 24px);
    padding: 18px;
  }

  .choices-container {
    gap: 12px;
  }

  .choice-button {
    width: min(32vw, 126px);
  }

  .choice-thumbnail {
    border-radius: 16px;
  }

  .choice-label {
    font-size: 0.58rem;
  }
}
</style>

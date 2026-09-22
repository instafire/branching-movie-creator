<template>
  <div
    class="video-player"
    :class="{ 'video-player-feed': isFeedVariant }"
    ref="playerContainer"
  >
    <video
      ref="videoElement"
      class="video-element"
      :style="feedVideoStyle"
      :muted="isMuted"
      preload="auto"
      playsinline
      @timeupdate="handleTimeUpdate"
      @loadedmetadata="handleMetadataLoaded"
      @ended="handleNativeEnded"
      @waiting="handleWaiting"
      @playing="handlePlaying"
      @pause="handlePause"
    />

    <audio
      ref="bgMusicElement"
      :src="bgMusicUrl"
      loop
      preload="auto"
    />

    <div v-if="isBuffering" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>

    <div v-if="autoplayBlocked" class="resume-overlay">
      <button class="resume-button" type="button" @click="resumePlayback">
        Play Preview
      </button>
    </div>

    <Transition name="fade">
      <ChoiceOverlay
        v-if="showChoices"
        :choices="promptChoicesWithTargets"
        :disabled="isBuffering"
        @select="handleChoiceSelect"
      />
    </Transition>

    <PlayerControls
      v-if="currentNode && showControls"
      :current-time="currentTimeMs"
      :duration="durationMs"
      :is-playing="isPlaying"
      :choices="availableChoices"
      @play="play"
      @pause="pause"
      @restart="restartStory"
      @seek="seek"
      @fullscreen="toggleFullscreen"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import { mediaApi } from '../../api/client'
import { usePlayerStore } from '../../stores/playerStore'
import type { Edge, Node } from '../../stores/graphStore'
import ChoiceOverlay from './ChoiceOverlay.vue'
import PlayerControls from './PlayerControls.vue'

const props = withDefaults(defineProps<{
  projectId: string
  nodes: Node[]
  edges: Edge[]
  startNodeId?: string
  variant?: 'default' | 'feed'
}>(), {
  variant: 'default',
})

const emit = defineEmits<{
  (e: 'ended'): void
  (e: 'error', error: Error): void
}>()

const playerStore = usePlayerStore()

const playerContainer = ref<HTMLDivElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
const bgMusicElement = ref<HTMLAudioElement | null>(null)

const currentNode = computed(() => playerStore.currentNode)
const currentTimeMs = computed(() => playerStore.currentTimeMs)
const durationMs = computed(() => playerStore.durationMs)
const isPlaying = computed(() => playerStore.isPlaying)
const isBuffering = computed(() => playerStore.isBuffering)
const promptChoices = computed(() => playerStore.promptChoices)
const availableChoices = computed(() => playerStore.availableChoices)
const showChoices = computed(() => playerStore.canShowChoices)
const isFeedVariant = computed(() => props.variant === 'feed')
const showControls = computed(() => !isFeedVariant.value)
const autoplayBlocked = ref(false)
const videoAspectRatio = ref(16 / 9)
const initialNodeLoaded = ref(false)
const feedVideoStyle = computed(() => {
  if (!isFeedVariant.value) {
    return undefined
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640

  if (isMobile) {
    return {
      width: '100vw',
      maxHeight: '100dvh',
    }
  }

  return videoAspectRatio.value < 1
    ? {
        width: 'min(82vw, 430px)',
        maxHeight: '86vh',
      }
    : {
        width: 'min(92vw, 1180px)',
        maxHeight: '82vh',
      }
})
const promptChoicesWithTargets = computed(() =>
  promptChoices.value.map((edge) => ({
    ...edge,
    target_node: props.nodes.find((node) => node.id === edge.target_node_id) ?? edge.target_node,
  }))
)

const isMuted = computed(() => currentNode.value?.mute_audio ?? false)
const bgMusicUrl = computed(() => currentNode.value?.bg_music_url ?? undefined)

function getInitialNode() {
  return (props.startNodeId
    ? props.nodes.find((node) => node.id === props.startNodeId)
    : null) || props.nodes.find((node) => node.node_type === 'start') || props.nodes[0] || null
}

watch(
  () => props.startNodeId,
  () => {
    initialNodeLoaded.value = false
  },
  { immediate: true }
)

watch(
  [() => props.nodes, () => props.startNodeId, videoElement],
  async ([nodes, startNodeId, video]) => {
    if (!nodes.length || !video || initialNodeLoaded.value) {
      return
    }

    const startNode = (startNodeId
      ? nodes.find((node) => node.id === startNodeId)
      : null) || nodes.find((node) => node.node_type === 'start') || nodes[0]

    if (startNode) {
      initialNodeLoaded.value = true
      await goToNode(startNode)
    }
  },
  { immediate: true }
)

async function resolveStreamUrl(node: Node): Promise<string | undefined> {
  if (node.media_clip?.stream_url) {
    return node.media_clip.stream_url
  }

  if (!node.media_clip?.id) {
    return undefined
  }

  const response = await mediaApi.getStreamUrl(node.media_clip.id)
  return response.data.url as string
}

function getChoicesForNode(nodeId: string): Edge[] {
  return props.edges
    .filter((edge) => edge.source_node_id === nodeId)
    .sort((left, right) => left.display_order - right.display_order)
}

async function loadVideoSource(video: HTMLVideoElement, sourceUrl: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const handleLoadedData = () => {
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(new Error('Unable to load video source'))
    }

    const cleanup = () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('error', handleError)
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('error', handleError)
    video.src = sourceUrl
    video.load()
  })
}

function isAutoplayBlocked(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return error.name === 'NotAllowedError'
    || error.message.toLowerCase().includes('notallowederror')
    || error.message.toLowerCase().includes('user didn')
}

async function startPlayback() {
  const video = videoElement.value

  if (!video) {
    return
  }

  try {
    await video.play()
    if (bgMusicElement.value && bgMusicUrl.value) {
      bgMusicElement.value.currentTime = 0
      bgMusicElement.value.play().catch(console.error)
    }
    autoplayBlocked.value = false
    playerStore.setPlaying(true)
  } catch (error) {
    if (isAutoplayBlocked(error)) {
      autoplayBlocked.value = true
      playerStore.setPlaying(false)
      return
    }

    throw error
  }
}

async function goToNode(node: Node, resumeTimeMs?: number) {
  const video = videoElement.value

  if (!video) {
    return
  }

  playerStore.setBuffering(true)
  playerStore.setCurrentNode(node)
  playerStore.setAvailableChoices(getChoicesForNode(node.id))
  autoplayBlocked.value = false

  video.pause()
  video.removeAttribute('src')
  video.load()

  if (!node.media_clip_id || !node.media_clip) {
    playerStore.setBuffering(false)

     if (availableChoices.value.length === 1) {
      const targetNode = props.nodes.find((candidate) => candidate.id === availableChoices.value[0].target_node_id)

      if (targetNode) {
        await goToNode(targetNode)
        return
      }
    }

    finalizeCurrentNode()
    return
  }

  try {
    const sourceUrl = await resolveStreamUrl(node)

    if (!sourceUrl) {
      throw new Error('Selected node has no playable media source')
    }

    await loadVideoSource(video, sourceUrl)

    const timeToStart = resumeTimeMs ?? node.start_time_ms
    video.currentTime = timeToStart / 1000
    playerStore.updateTime(timeToStart)
    await startPlayback()
  } catch (error) {
    playerStore.setBuffering(false)
    emit('error', error as Error)
    return
  }

  playerStore.setBuffering(false)
}

async function restartStory() {
  const initialNode = getInitialNode()

  if (!initialNode) {
    return
  }

  initialNodeLoaded.value = true
  await goToNode(initialNode)
}

function finalizeCurrentNode() {
  if (playerStore.isEnded) {
    return
  }

  if (playerStore.hasReturnPoint()) {
    const returnEntry = playerStore.popReturnPoint()
    if (returnEntry) {
      const returnNode = props.nodes.find((n) => n.id === returnEntry.nodeId)
      if (returnNode) {
        goToNode(returnNode, returnEntry.timeMs)
        return
      }
    }
  }

  playerStore.setEnded()

  if (availableChoices.value.length === 0) {
    emit('ended')
  }
}

function handleTimeUpdate() {
  if (!videoElement.value || !currentNode.value) {
    return
  }

  const absoluteMediaTime = videoElement.value.currentTime * 1000
  playerStore.updateTime(absoluteMediaTime)

  const absoluteEndTime = currentNode.value.end_time_ms ?? currentNode.value.media_clip?.duration_ms

  if (absoluteEndTime && absoluteMediaTime >= absoluteEndTime && !playerStore.isEnded) {
    videoElement.value.pause()
    if (bgMusicElement.value) {
      bgMusicElement.value.pause()
    }
    videoElement.value.currentTime = absoluteEndTime / 1000
    playerStore.updateTime(absoluteEndTime)
    
    if (currentNode.value.is_event_clip) {
      seek(0)
      play()
      return
    }

    finalizeCurrentNode()
  }
}

function handleMetadataLoaded() {
  if (!videoElement.value || !currentNode.value) {
    return
  }

  const duration = Math.round(videoElement.value.duration * 1000)
  const absoluteEndTime = currentNode.value.end_time_ms ?? duration
  const segmentDuration = absoluteEndTime - currentNode.value.start_time_ms
  const nextAspectRatio = videoElement.value.videoWidth && videoElement.value.videoHeight
    ? videoElement.value.videoWidth / videoElement.value.videoHeight
    : 16 / 9

  if (currentNode.value.media_clip) {
    currentNode.value.media_clip.duration_ms = duration
  }

  videoAspectRatio.value = nextAspectRatio
  playerStore.setDuration(segmentDuration)
}

function handleNativeEnded() {
  finalizeCurrentNode()
}

function handleWaiting() {
  playerStore.setBuffering(true)
}

function handlePlaying() {
  playerStore.setBuffering(false)
  playerStore.setPlaying(true)
}

function handlePause() {
  if (!playerStore.isEnded) {
    playerStore.setPlaying(false)
  }
}

async function play() {
  try {
    await videoElement.value?.play()
    if (bgMusicElement.value && bgMusicUrl.value) {
      bgMusicElement.value.play().catch(console.error)
    }
    playerStore.setPlaying(true)
  } catch (error) {
    emit('error', error as Error)
  }
}

function pause() {
  videoElement.value?.pause()
  if (bgMusicElement.value) {
    bgMusicElement.value.pause()
  }
  autoplayBlocked.value = false
  playerStore.setPlaying(false)
}

function seek(timeMs: number) {
  if (!videoElement.value || !currentNode.value) {
    return
  }

  videoElement.value.currentTime = (currentNode.value.start_time_ms + timeMs) / 1000
  playerStore.updateTime(videoElement.value.currentTime * 1000)
}

async function handleChoiceSelect(edge: Edge) {
  const targetNodeId = playerStore.selectChoice(edge)
  if (!targetNodeId) return

  const targetNode = props.nodes.find((node) => node.id === targetNodeId)

  if (targetNode) {
    if (edge.return_to_source && currentNode.value) {
      const returnTimeMs = currentNode.value.is_event_clip 
        ? currentNode.value.start_time_ms 
        : playerStore.mediaTimeMs
      playerStore.pushReturnPoint(
        currentNode.value.id,
        returnTimeMs,
        [...playerStore.availableChoices]
      )
    }
    await goToNode(targetNode)
  }
}

async function resumePlayback() {
  playerStore.setBuffering(true)

  try {
    await startPlayback()
  } catch (error) {
    emit('error', error as Error)
  } finally {
    playerStore.setBuffering(false)
  }
}

async function toggleFullscreen() {
  if (!playerContainer.value) {
    return
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }

  await playerContainer.value.requestFullscreen()
}

onUnmounted(() => {
  playerStore.reset()
})
</script>

<style scoped>
.video-player {
  position: relative;
  width: 100%;
  max-width: 1200px;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 25px 70px rgba(2, 6, 23, 0.55);
}

.video-player-feed {
  width: 100%;
  height: 100%;
  max-width: none;
  aspect-ratio: auto;
  border-radius: 0;
  box-shadow: none;
  background:
    radial-gradient(circle at top, rgba(255, 60, 92, 0.12), transparent 26%),
    radial-gradient(circle at bottom, rgba(15, 23, 42, 0.65), transparent 28%),
    #02030a;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.video-player-feed .video-element {
  position: absolute;
  top: 50%;
  left: 50%;
  width: auto;
  height: auto;
  transform: translate(-50%, -50%);
  object-fit: contain;
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  box-shadow: 0 26px 70px rgba(2, 6, 23, 0.5);
}

@media (max-width: 640px) {
  .video-player-feed .video-element {
    border-radius: 0;
    border: none;
    box-shadow: none;
  }

  .resume-button {
    padding: 16px 28px;
    font-size: 17px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
  }
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.45);
}

.resume-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.34);
  z-index: 8;
}

.video-player-feed .resume-overlay {
  background: rgba(2, 6, 23, 0.2);
}

.resume-button {
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  padding: 14px 22px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.45);
}

.resume-button:hover {
  background: rgba(30, 41, 59, 0.96);
}

.loading-spinner {
  width: 52px;
  height: 52px;
  border: 3px solid rgba(255, 255, 255, 0.24);
  border-top-color: #f8fafc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

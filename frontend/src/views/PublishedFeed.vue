<template>
  <div
    class="feed-shell"
    @wheel.prevent="handleWheel"
    @touchstart.passive="handleTouchStart"
    @touchend.passive="handleTouchEnd"
  >
    <div v-if="isFeedLoading" class="feed-status">Loading published movies…</div>

    <div v-else-if="publishedProjects.length === 0" class="feed-status">
      No published interactive movies yet.
    </div>

    <div v-else-if="errorMessage" class="feed-status feed-error">
      {{ errorMessage }}
    </div>

    <Transition v-else name="feed-swap" mode="out-in">
      <div :key="activeProject?.id" class="feed-stage">
        <div v-if="isProjectLoading" class="feed-status">Loading movie…</div>

        <VideoPlayer
          v-else-if="activeProject && loadedProjectId === activeProject.id && nodes.length > 0"
          :project-id="activeProject.id"
          :nodes="nodes"
          :edges="edges"
          variant="feed"
          @error="handlePlaybackError"
        />

        <div v-else class="feed-status">
          This published movie is not playable yet.
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import VideoPlayer from '../components/player/VideoPlayer.vue'
import { publicApi } from '../api/client'
import { useGraphStore } from '../stores/graphStore'

interface PublishedProject {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  is_published: boolean
  published_at?: string
}

const graphStore = useGraphStore()

const publishedProjects = ref<PublishedProject[]>([])
const activeIndex = ref(0)
const isFeedLoading = ref(true)
const isProjectLoading = ref(false)
const loadedProjectId = ref('')
const errorMessage = ref('')
const touchStartY = ref<number | null>(null)
const lastNavigationAt = ref(0)

const activeProject = computed(() => publishedProjects.value[activeIndex.value] ?? null)
const nodes = computed(() => graphStore.nodes)
const edges = computed(() => graphStore.edges)

onMounted(async () => {
  await loadFeed()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(activeProject, async (project) => {
  if (!project) {
    return
  }

  errorMessage.value = ''

  await loadProject(project.id)
})

async function loadFeed() {
  isFeedLoading.value = true
  errorMessage.value = ''

  try {
    const response = await publicApi.listPublishedProjects()
    publishedProjects.value = response.data as PublishedProject[]

    if (publishedProjects.value.length === 0) {
      return
    }

    activeIndex.value = 0
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'Unable to load published movies.'
  } finally {
    isFeedLoading.value = false
  }
}

async function loadProject(projectId: string) {
  isProjectLoading.value = true
  loadedProjectId.value = ''

  try {
    const project = await graphStore.loadGraph(projectId, { publicView: true })

    if (!project) {
      throw new Error(graphStore.error || 'Unable to load this movie.')
    }

    loadedProjectId.value = projectId
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to load this movie.'
  } finally {
    isProjectLoading.value = false
  }
}

function canNavigate() {
  return Date.now() - lastNavigationAt.value > 650
}

function goToIndex(nextIndex: number) {
  if (nextIndex < 0 || nextIndex >= publishedProjects.value.length || nextIndex === activeIndex.value) {
    return
  }

  lastNavigationAt.value = Date.now()
  activeIndex.value = nextIndex
}

function goToNextMovie() {
  goToIndex(activeIndex.value + 1)
}

function goToPreviousMovie() {
  goToIndex(activeIndex.value - 1)
}

function handleWheel(event: WheelEvent) {
  if (!canNavigate() || Math.abs(event.deltaY) < 40) {
    return
  }

  if (event.deltaY > 0) {
    goToNextMovie()
    return
  }

  goToPreviousMovie()
}

function handleTouchStart(event: TouchEvent) {
  touchStartY.value = event.changedTouches[0]?.clientY ?? null
}

function handleTouchEnd(event: TouchEvent) {
  if (touchStartY.value === null || !canNavigate()) {
    touchStartY.value = null
    return
  }

  const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY.value
  const deltaY = touchStartY.value - touchEndY
  touchStartY.value = null

  if (Math.abs(deltaY) < 60) {
    return
  }

  if (deltaY > 0) {
    goToNextMovie()
    return
  }

  goToPreviousMovie()
}

function handleKeydown(event: KeyboardEvent) {
  if (!canNavigate()) {
    return
  }

  if (event.key === 'ArrowDown') {
    goToNextMovie()
  }

  if (event.key === 'ArrowUp') {
    goToPreviousMovie()
  }
}

function handlePlaybackError(error: Error) {
  errorMessage.value = error.message || 'Playback failed.'
}
</script>

<style scoped>
.feed-shell {
  position: relative;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  background:
    radial-gradient(circle at top, rgba(255, 60, 92, 0.16), transparent 30%),
    radial-gradient(circle at bottom, rgba(34, 197, 94, 0.12), transparent 24%),
    #02030a;
  touch-action: pan-y;
}

.feed-stage {
  width: 100%;
  height: 100%;
}

.feed-status {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(248, 250, 252, 0.88);
  font-size: 1rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.feed-error {
  color: #fecaca;
}

.feed-swap-enter-active,
.feed-swap-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.feed-swap-enter-from,
.feed-swap-leave-to {
  opacity: 0;
  transform: translateY(28px);
}
</style>

<template>
  <div class="movie-shell">
    <div v-if="isLoading" class="movie-status">Loading movie…</div>

    <div v-else-if="errorMessage" class="movie-status movie-error">
      {{ errorMessage }}
    </div>

    <VideoPlayer
      v-else-if="nodes.length > 0"
      :project-id="projectId"
      :nodes="nodes"
      :edges="edges"
      variant="feed"
      @error="handlePlaybackError"
    />

    <div v-else class="movie-status">
      This published movie is not playable yet.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import VideoPlayer from '../components/player/VideoPlayer.vue'
import { useGraphStore } from '../stores/graphStore'

const route = useRoute()
const graphStore = useGraphStore()

const isLoading = ref(true)
const errorMessage = ref('')

const projectId = computed(() =>
  typeof route.params.id === 'string' ? route.params.id : ''
)
const nodes = computed(() => graphStore.nodes)
const edges = computed(() => graphStore.edges)

watch(
  projectId,
  async (nextProjectId) => {
    if (!nextProjectId) {
      errorMessage.value = 'Published movie not found.'
      isLoading.value = false
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    const project = await graphStore.loadGraph(nextProjectId, { publicView: true })

    if (!project) {
      errorMessage.value = graphStore.error || 'Unable to load this movie.'
    }

    isLoading.value = false
  },
  { immediate: true }
)

function handlePlaybackError(error: Error) {
  errorMessage.value = error.message || 'Playback failed.'
}
</script>

<style scoped>
.movie-shell {
  position: relative;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
  background:
    radial-gradient(circle at top, rgba(255, 60, 92, 0.16), transparent 30%),
    radial-gradient(circle at bottom, rgba(34, 197, 94, 0.12), transparent 24%),
    #02030a;
}

.movie-status {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(248, 250, 252, 0.88);
  font-size: 1rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  padding: 24px;
}

.movie-error {
  color: #fecaca;
}

@media (max-width: 640px) {
  .movie-status {
    font-size: 0.85rem;
    padding: 16px;
  }
}
</style>

<template>
  <div class="viewer-page">
    <header class="viewer-header">
      <button class="back-btn" type="button" @click="handleBack">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
        </svg>
        {{ isAuthenticated ? 'Back to Editor' : 'Back' }}
      </button>

      <div>
        <h1>{{ projectTitle || 'Interactive Movie' }}</h1>
        <p v-if="projectDescription" class="viewer-subtitle">{{ projectDescription }}</p>
      </div>
    </header>

    <main class="viewer-content">
      <div v-if="isLoading" class="status-card">
        Loading project…
      </div>

      <div v-else-if="errorMessage" class="status-card error-card">
        {{ errorMessage }}
      </div>

      <VideoPlayer
        v-else-if="nodes.length > 0"
        :project-id="projectId"
        :nodes="nodes"
        :edges="edges"
        :start-node-id="requestedStartNodeId || undefined"
        @ended="handleEnded"
        @error="handleError"
      />

      <div v-else class="status-card">
        This project does not have any playable nodes yet.
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import VideoPlayer from '../components/player/VideoPlayer.vue'
import { useAuthStore } from '../stores/authStore'
import { useGraphStore } from '../stores/graphStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const graphStore = useGraphStore()

const projectId = route.params.id as string
const projectTitle = ref('')
const projectDescription = ref('')
const isLoading = ref(true)
const errorMessage = ref('')
const requestedStartNodeId = computed(() =>
  typeof route.query.node === 'string' ? route.query.node : ''
)

const isAuthenticated = computed(() => authStore.isAuthenticated)
const nodes = computed(() => graphStore.nodes)
const edges = computed(() => graphStore.edges)

onMounted(async () => {
  isLoading.value = true
  errorMessage.value = ''

  const project = await graphStore.loadGraph(projectId, {
    publicView: !authStore.isAuthenticated,
  })

  if (!project) {
    errorMessage.value = graphStore.error || 'Unable to load this project.'
    isLoading.value = false
    return
  }

  projectTitle.value = project.title
  projectDescription.value = project.description || ''
  isLoading.value = false
})

function handleBack() {
  if (isAuthenticated.value) {
    router.push(`/projects/${projectId}/edit`)
    return
  }

  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push('/login')
}

function handleEnded() {
  console.log('Story ended')
}

function handleError(error: Error) {
  errorMessage.value = error.message || 'Playback failed.'
}
</script>

<style scoped>
.viewer-page {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - var(--app-header-height, 62px));
  margin: -24px;
}

.viewer-header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 24px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(17, 24, 39, 0.96)),
    #0b1120;
  border-bottom: 1px solid #243145;
}

.viewer-header h1 {
  font-size: 1.3rem;
}

.viewer-subtitle {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 14px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s;
}

.back-btn:hover {
  color: #f8fafc;
}

.viewer-content {
  flex: 1;
  min-height: clamp(28rem, 62dvh, 54rem);
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top, rgba(59, 130, 246, 0.18), transparent 30%),
    #020617;
  padding: 24px;
}

.status-card {
  min-width: min(480px, 100%);
  max-width: min(680px, 100%);
  padding: 24px 28px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid #243145;
  color: #e2e8f0;
  text-align: center;
  box-shadow: 0 20px 50px rgba(2, 6, 23, 0.45);
}

.error-card {
  color: #fecaca;
  border-color: rgba(239, 68, 68, 0.35);
}
</style>

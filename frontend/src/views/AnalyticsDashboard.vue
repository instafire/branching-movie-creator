<template>
  <div class="projects-page">
    <header class="page-header">
      <div>
        <router-link :to="`/projects/${projectId}/edit`" class="back-link">
          ← Back to Editor
        </router-link>
        <h1>Project Analytics</h1>
      </div>

      <div class="page-actions">
        <router-link :to="`/projects/${projectId}/edit`" class="btn btn-primary">
          Open Editor
        </router-link>
      </div>
    </header>

    <div v-if="isLoading" class="projects-grid">
      <div v-for="n in 3" :key="n" class="skeleton-card">
        <div class="skeleton-thumb skeleton-pulse" />
        <div class="skeleton-body">
          <div class="skeleton-line skeleton-pulse wide" />
          <div class="skeleton-line skeleton-pulse narrow" />
        </div>
      </div>
    </div>

    <div v-else-if="error" class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h2>Error Loading Analytics</h2>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="stats" class="analytics-content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total_sessions }}</div>
          <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.completed_sessions }}</div>
          <div class="stat-label">Completed Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ completionRate }}%</div>
          <div class="stat-label">Completion Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.nodes_visited }}</div>
          <div class="stat-label">Unique Nodes Visited</div>
        </div>
      </div>

      <div class="popular-paths-section">
        <h2>Popular Choices</h2>
        <div v-if="stats.popular_paths.length === 0" class="empty-paths">
          No choices made yet.
        </div>
        <div v-else class="paths-list">
          <div v-for="(path, index) in stats.popular_paths" :key="index" class="path-item">
            <div class="path-info">
              <span class="path-label">{{ path.choice_label }}</span>
              <span class="path-count">{{ path.choice_count }} selections</span>
            </div>
            <div class="path-bar-container">
              <div
                class="path-bar"
                :style="{ width: `${(path.choice_count / maxPathCount) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { analyticsApi } from '../api/client'

interface PopularPath {
  choice_label: string
  choice_count: number
}

interface ProjectStats {
  total_sessions: number | string
  completed_sessions: number | string
  nodes_visited: number | string
  popular_paths: PopularPath[]
}

const route = useRoute()
const projectId = computed(() => route.params.id as string)

const isLoading = ref(true)
const error = ref<string | null>(null)
const stats = ref<ProjectStats | null>(null)

const completionRate = computed(() => {
  if (!stats.value || !stats.value.total_sessions) return 0
  const total = Number(stats.value.total_sessions)
  if (total === 0) return 0
  return Math.round((Number(stats.value.completed_sessions) / total) * 100)
})

const maxPathCount = computed(() => {
  if (!stats.value || stats.value.popular_paths.length === 0) return 1
  return Math.max(...stats.value.popular_paths.map((p) => Number(p.choice_count)))
})

async function fetchStats() {
  isLoading.value = true
  error.value = null

  try {
    const response = await analyticsApi.getProjectStats(projectId.value)
    stats.value = response.data
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load project analytics'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.back-link {
  display: inline-block;
  color: #94a3b8;
  font-size: 14px;
  text-decoration: none;
  margin-bottom: 8px;
  transition: color 0.2s;
}

.back-link:hover {
  color: #fff;
}

.analytics-content {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
  animation: fadeIn 0.4s ease-out;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.stat-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(56, 189, 248, 0.4);
}

.stat-value {
  font-size: 42px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 8px;
  font-family: 'Audiowide', 'Syne', sans-serif;
  text-shadow: 0 0 16px rgba(56, 189, 248, 0.4);
}

.stat-label {
  color: #94a3b8;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.popular-paths-section {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid #1e293b;
  border-radius: 16px;
  padding: 32px;
}

.popular-paths-section h2 {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: #f8fafc;
}

.empty-paths {
  color: #64748b;
  text-align: center;
  padding: 40px 0;
  font-style: italic;
}

.paths-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.path-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.path-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.path-label {
  color: #e2e8f0;
  font-weight: 500;
}

.path-count {
  color: #94a3b8;
}

.path-bar-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.path-bar {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  border-radius: 4px;
  transition: width 1s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

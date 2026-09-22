<template>
  <div class="feed-page">
    <header class="feed-header">
      <div>
        <h1>Interactive Movies</h1>
        <p class="feed-subtitle">Explore branching stories created by the community</p>
      </div>
      <div class="feed-actions">
        <router-link v-if="isAuthenticated" to="/projects" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
          Back to Studio
        </router-link>
        <router-link v-else to="/login" class="btn btn-primary">
          Log In / Register
        </router-link>
      </div>
    </header>

    <div v-if="isLoading" class="feed-grid">
      <div v-for="n in 6" :key="n" class="skeleton-card">
        <div class="skeleton-thumb skeleton-pulse" />
        <div class="skeleton-body">
          <div class="skeleton-line skeleton-pulse wide" />
          <div class="skeleton-line skeleton-pulse narrow" />
        </div>
      </div>
    </div>

    <div v-else-if="error" class="feed-center">
      <div class="feed-status-card">
        <p class="error-text">{{ error }}</p>
        <button class="btn btn-primary" @click="loadFeed">Retry</button>
      </div>
    </div>

    <div v-else-if="movies.length === 0" class="feed-center">
      <div class="feed-empty-card">
        <div class="feed-empty-icon">
          <svg viewBox="0 0 24 24" width="56" height="56">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
          </svg>
        </div>
        <h2>No published movies yet</h2>
        <p>When creators publish their interactive stories, they'll appear here for everyone to explore.</p>
        <router-link v-if="isAuthenticated" to="/projects" class="btn btn-primary">
          Create a Movie
        </router-link>
        <router-link v-else to="/login" class="btn btn-primary">
          Log In to Create a Movie
        </router-link>
      </div>
    </div>

    <div v-else class="feed-grid">
      <router-link
        v-for="movie in movies"
        :key="movie.id"
        :to="`/movies/${movie.id}`"
        class="movie-card"
      >
        <div class="movie-thumbnail">
          <img v-if="movie.thumbnail_url" :src="movie.thumbnail_url" :alt="movie.title" />
          <div v-else class="movie-placeholder">
            <svg viewBox="0 0 24 24" width="44" height="44">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
            </svg>
          </div>
          <div class="play-overlay">
            <div class="play-circle">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <polygon points="8,5 19,12 8,19" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <span v-if="movie.node_count" class="node-chip">{{ movie.node_count }} scenes</span>
        </div>

        <div class="movie-info">
          <h3>{{ movie.title }}</h3>
          <p v-if="movie.description" class="movie-desc">{{ movie.description }}</p>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { publicApi } from '../api/client'
import { useAuthStore } from '../stores/authStore'

interface MovieSummary {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  node_count?: number
  published_at?: string
}

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

const movies = ref<MovieSummary[]>([])
const isLoading = ref(true)
const error = ref('')

onMounted(() => loadFeed())

async function loadFeed() {
  isLoading.value = true
  error.value = ''

  try {
    const response = await publicApi.listPublishedProjects()
    movies.value = response.data
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load movies'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.feed-page {
  min-height: 100dvh;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.1), transparent 35%),
    radial-gradient(circle at bottom right, rgba(255, 60, 92, 0.08), transparent 35%),
    #02030a;
  padding: 0 24px 48px;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 28px 0 32px;
}

.feed-header h1 {
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  color: #f8fafc;
}

.feed-subtitle {
  color: #94a3b8;
  font-size: 14px;
  margin-top: 4px;
}

/* Skeleton */
.skeleton-card {
  border-radius: 22px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.skeleton-thumb {
  aspect-ratio: 16 / 9;
}

.skeleton-body {
  padding: 16px 18px;
  display: grid;
  gap: 10px;
}

.skeleton-line {
  height: 14px;
  border-radius: 8px;
}

.skeleton-line.wide { width: 70%; }
.skeleton-line.narrow { width: 45%; }

.skeleton-pulse {
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.06) 25%, rgba(148, 163, 184, 0.12) 50%, rgba(148, 163, 184, 0.06) 75%);
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Center states */
.feed-center {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.feed-status-card {
  text-align: center;
  padding: 32px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 24px;
}

.error-text {
  color: #fecaca;
  margin-bottom: 16px;
}

.feed-empty-card {
  text-align: center;
  max-width: 400px;
  padding: 48px 32px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 28px;
  backdrop-filter: blur(12px);
}

.feed-empty-icon {
  color: #475569;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.feed-empty-card h2 {
  font-size: 1.3rem;
  margin-bottom: 8px;
  color: #f8fafc;
}

.feed-empty-card p {
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 24px;
}

/* Movie grid */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.movie-card {
  display: block;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 22px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, box-shadow 0.3s ease;
}

.movie-card:hover {
  transform: translateY(-6px);
  border-color: rgba(255, 60, 92, 0.35);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35), 0 0 20px rgba(255, 60, 92, 0.12);
}

.movie-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  background:
    radial-gradient(circle at center, rgba(255, 60, 92, 0.12), transparent 60%),
    #0f172a;
  overflow: hidden;
}

.movie-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.movie-card:hover .movie-thumbnail img {
  transform: scale(1.06);
}

.movie-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.movie-card:hover .play-overlay {
  opacity: 1;
}

.play-circle {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: rgba(255, 60, 92, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 28px rgba(255, 42, 76, 0.4);
  transition: transform 0.25s ease;
}

.movie-card:hover .play-circle {
  transform: scale(1.08);
}

.node-chip {
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.72);
  color: rgba(248, 250, 252, 0.85);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  backdrop-filter: blur(8px);
}

.movie-info {
  padding: 16px 18px 20px;
}

.movie-info h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 6px;
}

.movie-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Button styles (replicated for standalone feed page) */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 14px;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  color: #00111a;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.btn-secondary:hover {
  background: rgba(148, 163, 184, 0.14);
}

@media (max-width: 720px) {
  .feed-page {
    padding: 0 16px 32px;
  }

  .feed-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .feed-grid {
    grid-template-columns: 1fr;
  }
}
</style>

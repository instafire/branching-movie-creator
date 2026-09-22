<template>
  <div class="projects-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Studio</p>
        <h1>My Projects</h1>
      </div>

      <div class="page-actions">
        <router-link to="/feed" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" fill="currentColor"/></svg>
          Feed
        </router-link>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
          New Project
        </button>
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

    <div v-else-if="projects.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="56" height="56">
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
        </svg>
      </div>
      <h2>No projects yet</h2>
      <p>Create your first branching narrative project.</p>
      <div class="empty-steps">
        <span class="step"><strong>1.</strong> Create a project</span>
        <span class="step-arrow">→</span>
        <span class="step"><strong>2.</strong> Upload clips</span>
        <span class="step-arrow">→</span>
        <span class="step"><strong>3.</strong> Connect the story</span>
      </div>
      <button class="btn btn-primary" @click="showCreateModal = true">
        Create Project
      </button>
    </div>

    <div v-else class="projects-grid">
      <article
        v-for="project in projects"
        :key="project.id"
        class="project-card"
        @click="$router.push(`/projects/${project.id}/edit`)"
      >
        <div class="project-thumbnail">
          <img v-if="project.thumbnail_url" :src="project.thumbnail_url" alt="" />
          <div v-else class="placeholder-thumb">
            <svg viewBox="0 0 24 24" width="40" height="40">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
            </svg>
          </div>

          <div class="thumb-overlay">
            <svg viewBox="0 0 24 24" width="32" height="32"><polygon points="8,5 19,12 8,19" fill="currentColor"/></svg>
          </div>

          <span v-if="project.is_published" class="published-badge">Published</span>
        </div>

        <div class="project-info">
          <h3>{{ project.title }}</h3>
          <p v-if="project.description" class="project-desc">{{ project.description }}</p>
          <div class="project-meta-row">
            <span class="project-meta">
              {{ project.node_count || 0 }} nodes
            </span>
            <span v-if="project.updated_at" class="project-meta">
              {{ formatRelativeTime(project.updated_at) }}
            </span>
          </div>
        </div>

        <div class="project-footer">
          <router-link
            :to="`/projects/${project.id}/view`"
            class="btn btn-primary btn-sm"
            @click.stop
          >
            Preview
          </router-link>
          <div class="dropdown-container" @click.stop>
            <button class="dropdown-trigger" @click="toggleDropdown(project.id)">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="5" r="2" fill="currentColor"/>
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                <circle cx="12" cy="19" r="2" fill="currentColor"/>
              </svg>
            </button>
            <Transition name="dropdown">
              <div v-if="openDropdownId === project.id" class="dropdown-menu">
                <router-link :to="`/projects/${project.id}/edit`" class="dropdown-item">
                  Edit
                </router-link>
                <button
                  v-if="project.is_published"
                  class="dropdown-item"
                  @click="handleCopyPublicLink(project.id)"
                >
                  {{ copiedProjectId === project.id ? '✓ Copied!' : 'Copy Link' }}
                </button>
                <button
                  class="dropdown-item"
                  :disabled="publishingProjectId === project.id"
                  @click="handlePublishToggle(project.id, project.is_published)"
                >
                  {{
                    publishingProjectId === project.id
                      ? 'Saving...'
                      : (project.is_published ? 'Unpublish' : 'Publish')
                  }}
                </button>
                <button class="dropdown-item dropdown-danger" @click="handleDelete(project.id)">
                  Delete
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </article>
    </div>

    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Create New Project</h2>
          <button class="modal-close" type="button" @click="closeCreateModal">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
          </button>
        </div>

        <form @submit.prevent="handleCreate">
          <div class="form-group">
            <label>Project Title</label>
            <input
              v-model="newProjectTitle"
              type="text"
              placeholder="My Interactive Story"
              required
            />
          </div>

          <div class="form-group">
            <label>Description (optional)</label>
            <textarea
              v-model="newProjectDescription"
              placeholder="A brief description of your project"
              rows="3"
            />
          </div>

          <p v-if="createError" class="error-message">{{ createError }}</p>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeCreateModal">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isLoading">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/projectStore'
import { useToastStore } from '../stores/toastStore'

const router = useRouter()
const projectStore = useProjectStore()
const toastStore = useToastStore()

const showCreateModal = ref(false)
const newProjectTitle = ref('')
const newProjectDescription = ref('')
const createError = ref('')
const publishingProjectId = ref<string | null>(null)
const copiedProjectId = ref<string | null>(null)
const openDropdownId = ref<string | null>(null)
let copyLinkResetTimeout: number | null = null

const projects = computed(() => projectStore.projects)
const isLoading = computed(() => projectStore.isLoading)

onMounted(() => {
  projectStore.fetchProjects()
  document.addEventListener('click', closeAllDropdowns)
})

onUnmounted(() => {
  if (copyLinkResetTimeout !== null) {
    window.clearTimeout(copyLinkResetTimeout)
  }
  document.removeEventListener('click', closeAllDropdowns)
})

function closeAllDropdowns() {
  openDropdownId.value = null
}

function toggleDropdown(id: string) {
  openDropdownId.value = openDropdownId.value === id ? null : id
}

function closeCreateModal() {
  showCreateModal.value = false
  createError.value = ''
}

async function handleCreate() {
  createError.value = ''

  const project = await projectStore.createProject(
    newProjectTitle.value,
    newProjectDescription.value
  )

  if (!project) {
    createError.value = projectStore.error || 'Failed to create project'
    return
  }

  showCreateModal.value = false
  newProjectTitle.value = ''
  newProjectDescription.value = ''
  toastStore.success('Project created!')
  router.push(`/projects/${project.id}/edit`)
}

async function handleDelete(id: string) {
  if (confirm('Are you sure you want to delete this project?')) {
    await projectStore.deleteProject(id)
    openDropdownId.value = null
    toastStore.info('Project deleted')
  }
}

async function handlePublishToggle(id: string, isPublished: boolean) {
  publishingProjectId.value = id

  try {
    if (isPublished) {
      await projectStore.unpublishProject(id)
      toastStore.info('Project unpublished')
      return
    }

    await projectStore.publishProject(id)
    toastStore.success('Project published!')
  } finally {
    publishingProjectId.value = null
    openDropdownId.value = null
  }
}

async function handleCopyPublicLink(projectId: string) {
  const publicUrl = `${window.location.origin}/movies/${projectId}`

  try {
    await navigator.clipboard.writeText(publicUrl)
    copiedProjectId.value = projectId
    toastStore.success('Link copied to clipboard')

    if (copyLinkResetTimeout !== null) {
      window.clearTimeout(copyLinkResetTimeout)
    }

    copyLinkResetTimeout = window.setTimeout(() => {
      copiedProjectId.value = null
    }, 1800)
  } catch (error) {
    console.error('Failed to copy public link:', error)
    window.prompt('Copy this public link', publicUrl)
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}
</script>

<style scoped>
.projects-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.eyebrow {
  color: #7dd3fc;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}

.page-actions {
  display: flex;
  gap: 10px;
}

.page-header h1 {
  font-size: clamp(2rem, 3vw, 2.75rem);
}

/* Skeleton loading */
.skeleton-card {
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.08);
  background: rgba(15, 23, 42, 0.7);
}

.skeleton-thumb {
  aspect-ratio: 16 / 9;
}

.skeleton-body {
  padding: 18px;
  display: grid;
  gap: 10px;
}

.skeleton-line {
  height: 14px;
  border-radius: 8px;
}

.skeleton-line.wide { width: 70%; }
.skeleton-line.narrow { width: 40%; }

.skeleton-pulse {
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.06) 25%, rgba(148, 163, 184, 0.12) 50%, rgba(148, 163, 184, 0.06) 75%);
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 72px 24px;
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.78);
}

.empty-icon {
  color: #475569;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.empty-state h2 {
  font-size: 1.4rem;
  margin-bottom: 8px;
}

.empty-state p {
  color: #94a3b8;
  margin-bottom: 20px;
}

.empty-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
  color: #94a3b8;
  font-size: 13px;
}

.step {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.15);
  color: #bae6fd;
}

.step strong {
  color: #38bdf8;
}

.step-arrow {
  color: #475569;
}

/* Projects grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 22px;
}

.project-card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.1);
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, box-shadow 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  border-color: rgba(56, 189, 248, 0.28);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.3);
}

.project-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 42%),
    linear-gradient(135deg, #0f172a, #111827);
  overflow: hidden;
}

.project-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.project-card:hover .project-thumbnail img {
  transform: scale(1.05);
}

.thumb-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.9);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.project-card:hover .thumb-overlay {
  opacity: 1;
}

.placeholder-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
}

.published-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(16, 185, 129, 0.92);
  color: white;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.project-info {
  padding: 16px 18px 10px;
}

.project-info h3 {
  font-size: 1.05rem;
  margin-bottom: 4px;
}

.project-desc {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.project-meta {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.project-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px 16px;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
}

/* Dropdown */
.dropdown-container {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  color: #94a3b8;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.dropdown-trigger:hover {
  background: rgba(148, 163, 184, 0.08);
  color: #f8fafc;
}

.dropdown-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px);
  z-index: 50;
}

.dropdown-menu .dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s ease;
}

.dropdown-menu .dropdown-item:hover {
  background: rgba(148, 163, 184, 0.1);
}

.dropdown-menu .dropdown-danger {
  color: #f87171;
}

.dropdown-menu .dropdown-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 8, 23, 0.72);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 24px;
  padding: 28px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
  animation: modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  color: #94a3b8;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.modal-close:hover {
  background: rgba(148, 163, 184, 0.08);
  color: #f8fafc;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.modal-actions .btn {
  flex: 1;
}

.error-message {
  color: #fecaca;
  background: rgba(127, 29, 29, 0.82);
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 13px;
}

/* Dropdown transitions (reuses from App.vue) */
.dropdown-enter-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.95);
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .page-actions {
    width: 100%;
  }

  .page-actions .btn {
    flex: 1;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .modal {
    padding: 24px;
  }

  .modal-actions {
    flex-direction: column;
  }
}
</style>

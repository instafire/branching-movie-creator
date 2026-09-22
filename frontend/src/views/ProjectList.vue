<template>
  <div class="projects-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Studio</p>
        <h1>My Projects</h1>
      </div>

      <div class="page-actions">
        <router-link to="/feed" class="btn btn-secondary">
          Open Feed
        </router-link>
        <button class="btn btn-primary" @click="showCreateModal = true">
          New Project
        </button>
      </div>
    </header>

    <div v-if="isLoading" class="loading">Loading projects...</div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" width="64" height="64">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" fill="currentColor"/>
        </svg>
      </div>
      <h2>No projects yet</h2>
      <p>Create your first branching narrative project.</p>
      <button class="btn btn-primary" @click="showCreateModal = true">
        Create Project
      </button>
    </div>

    <div v-else class="projects-grid">
      <article
        v-for="project in projects"
        :key="project.id"
        class="project-card"
      >
        <div class="project-thumbnail">
          <img v-if="project.thumbnail_url" :src="project.thumbnail_url" alt="" />
          <div v-else class="placeholder-thumb">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
            </svg>
          </div>

          <span v-if="project.is_published" class="published-badge">Published</span>
        </div>

        <div class="project-info">
          <h3>{{ project.title }}</h3>
          <p v-if="project.description">{{ project.description }}</p>
          <div class="project-meta-row">
            <span class="project-meta">
              {{ project.node_count || 0 }} nodes
            </span>
            <router-link
              v-if="project.is_published"
              :to="`/movies/${project.id}`"
              class="project-live-link"
            >
              Live
            </router-link>
          </div>
        </div>

        <div class="project-actions">
          <router-link :to="`/projects/${project.id}/edit`" class="btn btn-secondary">
            Edit
          </router-link>
          <router-link :to="`/projects/${project.id}/view`" class="btn btn-primary">
            Preview
          </router-link>
          <button
            v-if="project.is_published"
            class="btn btn-secondary"
            @click="handleCopyPublicLink(project.id)"
          >
            {{ copiedProjectId === project.id ? 'Copied Link' : 'Copy Link' }}
          </button>
          <button
            class="btn btn-secondary"
            :disabled="publishingProjectId === project.id"
            @click="handlePublishToggle(project.id, project.is_published)"
          >
            {{
              publishingProjectId === project.id
                ? 'Saving...'
                : (project.is_published ? 'Unpublish' : 'Publish')
            }}
          </button>
          <button class="btn btn-danger" @click="handleDelete(project.id)">
            Delete
          </button>
        </div>
      </article>
    </div>

    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal">
        <h2>Create New Project</h2>

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

const router = useRouter()
const projectStore = useProjectStore()

const showCreateModal = ref(false)
const newProjectTitle = ref('')
const newProjectDescription = ref('')
const createError = ref('')
const publishingProjectId = ref<string | null>(null)
const copiedProjectId = ref<string | null>(null)
let copyLinkResetTimeout: number | null = null

const projects = computed(() => projectStore.projects)
const isLoading = computed(() => projectStore.isLoading)

onMounted(() => {
  projectStore.fetchProjects()
})

onUnmounted(() => {
  if (copyLinkResetTimeout !== null) {
    window.clearTimeout(copyLinkResetTimeout)
  }
})

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
  router.push(`/projects/${project.id}/edit`)
}

async function handleDelete(id: string) {
  if (confirm('Are you sure you want to delete this project?')) {
    await projectStore.deleteProject(id)
  }
}

async function handlePublishToggle(id: string, isPublished: boolean) {
  publishingProjectId.value = id

  try {
    if (isPublished) {
      await projectStore.unpublishProject(id)
      return
    }

    await projectStore.publishProject(id)
  } finally {
    publishingProjectId.value = null
  }
}

async function handleCopyPublicLink(projectId: string) {
  const publicUrl = `${window.location.origin}/movies/${projectId}`

  try {
    await navigator.clipboard.writeText(publicUrl)
    copiedProjectId.value = projectId

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
  gap: 12px;
}

.page-header h1 {
  font-size: clamp(2rem, 3vw, 2.75rem);
}

.loading {
  text-align: center;
  color: #94a3b8;
  padding: 48px;
}

.empty-state {
  text-align: center;
  padding: 72px 24px;
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.78);
  box-shadow: var(--shadow);
}

.empty-icon {
  color: #475569;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 1.4rem;
  margin-bottom: 8px;
}

.empty-state p {
  color: #94a3b8;
  margin-bottom: 24px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.project-card {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.12);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  border-color: rgba(56, 189, 248, 0.28);
  box-shadow: var(--shadow);
}

.project-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 42%),
    linear-gradient(135deg, #0f172a, #111827);
}

.project-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  top: 14px;
  right: 14px;
  background: rgba(16, 185, 129, 0.92);
  color: white;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.project-info {
  padding: 18px;
}

.project-info h3 {
  font-size: 1.05rem;
  margin-bottom: 6px;
}

.project-info p {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.project-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.project-live-link {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fda4af;
  text-decoration: none;
}

.project-live-link:hover {
  color: #ffe4e6;
}

.project-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 18px 18px;
}

.project-actions .btn {
  padding-inline: 12px;
}

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
  border-radius: 28px;
  padding: 32px;
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow);
}

.modal h2 {
  margin-bottom: 22px;
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

  .project-actions {
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

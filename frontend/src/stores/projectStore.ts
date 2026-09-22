import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { projectsApi } from '../api/client'

export interface Project {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  is_published: boolean
  created_at: string
  updated_at: string
  node_count?: number
  theme_color?: string
}

export interface ProjectGraph extends Project {
  nodes: unknown[]
  edges: unknown[]
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<ProjectGraph | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const publishedProjects = computed(() =>
    projects.value.filter((project) => project.is_published)
  )

  async function fetchProjects() {
    isLoading.value = true
    error.value = null

    try {
      const response = await projectsApi.list()
      projects.value = response.data
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Failed to fetch projects'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchProject(id: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await projectsApi.get(id)
      currentProject.value = response.data
      return response.data as ProjectGraph
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Failed to fetch project'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createProject(title: string, description?: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await projectsApi.create({ title, description })
      const project = response.data as Project
      projects.value.unshift(project)
      return project
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || 'Failed to create project'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateProject(id: string, data: Partial<Project>) {
    try {
      const response = await projectsApi.update(id, data)
      const updatedProject = response.data as Project
      const index = projects.value.findIndex((project) => project.id === id)

      if (index !== -1) {
        projects.value[index] = updatedProject
      }

      if (currentProject.value?.id === id) {
        currentProject.value = { ...currentProject.value, ...updatedProject }
      }

      return updatedProject
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Failed to update project'
      return null
    }
  }

  async function deleteProject(id: string) {
    try {
      await projectsApi.delete(id)
      projects.value = projects.value.filter((project) => project.id !== id)

      if (currentProject.value?.id === id) {
        currentProject.value = null
      }

      return true
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Failed to delete project'
      return false
    }
  }

  async function publishProject(id: string) {
    try {
      const response = await projectsApi.publish(id)
      const updatedProject = response.data as Project
      const index = projects.value.findIndex((project) => project.id === id)

      if (index !== -1) {
        projects.value[index] = updatedProject
      }

      if (currentProject.value?.id === id) {
        currentProject.value = { ...currentProject.value, ...updatedProject }
      }

      return updatedProject
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Failed to publish project'
      return null
    }
  }

  async function unpublishProject(id: string) {
    try {
      const response = await projectsApi.unpublish(id)
      const updatedProject = response.data as Project
      const index = projects.value.findIndex((project) => project.id === id)

      if (index !== -1) {
        projects.value[index] = updatedProject
      }

      if (currentProject.value?.id === id) {
        currentProject.value = { ...currentProject.value, ...updatedProject }
      }

      return updatedProject
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Failed to unpublish project'
      return null
    }
  }

  return {
    projects,
    currentProject,
    isLoading,
    error,
    publishedProjects,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    publishProject,
    unpublishProject,
  }
})

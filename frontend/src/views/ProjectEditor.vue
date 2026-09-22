<template>
  <div class="editor-page">
    <header class="editor-header">
      <div class="header-left">
        <router-link to="/projects" class="back-btn" aria-label="Back to projects">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
          </svg>
        </router-link>

        <div class="project-heading">
          <input
            v-model="projectTitle"
            class="title-input"
            placeholder="Untitled story"
            @blur="saveTitle"
            @keyup.enter="saveTitle"
          />
          <div class="project-subtitle-row">
            <p class="project-hint">Build the path users will see and branch through.</p>
            <span v-if="saveStatus" class="save-badge" :class="saveStatus">
              {{ saveStatus === 'saving' ? 'Saving…' : 'Saved ✓' }}
            </span>
            <span class="publish-status-badge" :class="isPublished ? 'published' : 'draft'">
              {{ isPublished ? 'Published' : 'Draft' }}
            </span>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <div class="header-panel-toggles" role="group" aria-label="Workspace panels">
          <button
            class="panel-toggle"
            :class="{ active: !isSidebarCollapsed }"
            type="button"
            :aria-pressed="!isSidebarCollapsed"
            @click="isSidebarCollapsed = !isSidebarCollapsed"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M4 5h16v2H4zm0 6h8v2H4zm0 6h16v2H4z" fill="currentColor" />
            </svg>
            Library
          </button>

          <button
            class="panel-toggle"
            :class="{ active: !isTimelineCollapsed }"
            type="button"
            :aria-pressed="!isTimelineCollapsed"
            @click="isTimelineCollapsed = !isTimelineCollapsed"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M5 6h14v2H5zm0 5h10v2H5zm0 5h14v2H5z" fill="currentColor" />
            </svg>
            Timeline
          </button>
        </div>

        <div class="header-primary-actions">
          <button class="btn btn-secondary btn-compact" @click="openUploadModal">
            Upload
          </button>
          <button
            v-if="selectedNode"
            class="btn btn-secondary btn-compact"
            @click="handlePreviewFromSelected"
          >
            From Here
          </button>
          <button class="btn btn-primary btn-compact" @click="handlePreview">
            Preview
          </button>
          <router-link
            v-if="isPublished"
            :to="`/movies/${projectId}`"
            class="btn btn-secondary btn-compact"
            target="_blank"
          >
            View on Feed
          </router-link>
          <router-link
            :to="`/projects/${projectId}/analytics`"
            class="btn btn-secondary btn-compact"
          >
            Analytics
          </router-link>
          <button
            class="btn btn-compact"
            :class="isPublished ? 'btn-danger' : 'btn-publish'"
            :disabled="isPublishing"
            @click="handlePublishToggle"
          >
            {{ isPublishing ? 'Saving…' : (isPublished ? 'Unpublish' : 'Publish') }}
          </button>
        </div>
      </div>
    </header>

    <div class="editor-layout">
      <aside v-show="!isSidebarCollapsed" class="editor-sidebar">
        <section class="sidebar-section">
          <div class="section-header">
            <h3>Media Library</h3>
            <span class="section-meta">{{ mediaClips.length }} clips</span>
          </div>

          <div v-if="mediaClips.length === 0" class="empty-media">
            <p>No clips uploaded yet.</p>
            <button class="btn btn-secondary" @click="openUploadModal">Upload media</button>
          </div>

          <div v-else class="media-list">
            <div
              v-for="clip in mediaClips"
              :key="clip.id"
              class="media-item"
              :class="{ processing: clip.processing_status !== 'completed' }"
            >
              <img v-if="clip.thumbnail_url" :src="clip.thumbnail_url" alt="" />
              <div v-else class="media-placeholder">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
                </svg>
              </div>

              <div class="media-copy">
                <span class="media-name">{{ clip.original_filename }}</span>
                <span class="media-status">
                  {{ clip.processing_status === 'completed' ? 'Ready to use' : clip.processing_status }}
                </span>
              </div>

              <div class="media-actions">
                <button
                  v-if="clip.processing_status === 'completed' && clip.stream_url"
                  type="button"
                  class="media-tool-btn"
                  @click="createNodeFromClip(clip)"
                >
                  Create Node
                </button>
                <button
                  v-if="clip.processing_status === 'completed' && clip.stream_url"
                  type="button"
                  class="media-tool-btn"
                  @click="openThumbnailModal(clip)"
                >
                  Thumbnail
                </button>
                <span
                  v-if="currentProjectThumbnailUrl && clip.thumbnail_url === currentProjectThumbnailUrl"
                  class="cover-chip"
                >
                  Cover
                </span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="selectedNode" class="sidebar-section">
          <div class="section-header">
            <h3>Node Properties</h3>
            <span class="section-meta">{{ selectedNode.node_type }}</span>
          </div>

          <div class="form-group">
            <label for="node-label">Label</label>
            <input id="node-label" v-model="selectedNode.label" @change="saveNode" />
          </div>

          <div class="form-group">
            <label for="node-media">Media Clip</label>
            <select id="node-media" v-model="selectedNode.media_clip_id" @change="saveNode">
              <option value="">None</option>
              <option v-for="clip in mediaClips" :key="clip.id" :value="clip.id">
                {{ clip.original_filename }}
              </option>
            </select>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="node-start">Start (ms)</label>
              <input id="node-start" v-model.number="selectedNode.start_time_ms" type="number" min="0" @change="saveNode" />
            </div>

            <div class="form-group">
              <label for="node-end">End (ms)</label>
              <input id="node-end" v-model.number="selectedNode.end_time_ms" type="number" min="0" @change="saveNode" />
            </div>
          </div>

          <div class="form-group checkbox">
            <label>
              <input v-model="selectedNode.is_ending" type="checkbox" @change="saveNode" />
              Mark as ending node
            </label>
          </div>

          <div class="form-group checkbox">
            <label>
              <input v-model="selectedNode.mute_audio" type="checkbox" @change="saveNode" />
              Mute original audio
            </label>
          </div>

          <div class="form-group checkbox">
            <label>
              <input v-model="selectedNode.is_event_clip" type="checkbox" @change="saveNode" />
              Event clip (loop & return)
            </label>
            <span class="form-hint" style="display:block;margin-top:4px;">Returns viewer to start after playing without returning to main flow.</span>
          </div>

          <div class="form-group">
            <label for="node-bgm">Background Music URL</label>
            <input
              id="node-bgm"
              v-model="selectedNode.bg_music_url"
              placeholder="/audio/music.mp3 or valid URL"
              @change="saveNode"
            />
          </div>

          <button class="btn btn-danger full-width" @click="handleDeleteNode">
            Delete Node
          </button>

          <button class="btn btn-secondary full-width" @click="handlePreviewFromSelected">
            Preview From This Node
          </button>
        </section>

        <section v-if="choiceEditorItems.length > 0" class="sidebar-section">
          <div class="section-header">
            <h3>All Choices</h3>
            <span class="section-meta">{{ choiceEditorItems.length }} branches</span>
          </div>

          <div class="choice-editor-list">
            <div
              v-for="choice in choiceEditorItems"
              :key="choice.id"
              class="choice-editor-item"
              :class="{ active: selectedEdge?.id === choice.id }"
              @click="focusEdge(choice.id)"
            >
              <div class="choice-editor-header">
                <span class="choice-route">{{ choice.sourceLabel }} → {{ choice.targetLabel }}</span>
                <span class="choice-time">{{ formatTimestamp(choice.absoluteTriggerMs) }}</span>
              </div>

              <input
                v-model="choice.choice_label"
                class="choice-name-input"
                type="text"
                placeholder="Choice name"
                @click.stop
                @change="saveChoiceItem(choice)"
              />
            </div>
          </div>
        </section>

        <section v-if="selectedEdge" class="sidebar-section">
          <div class="section-header">
            <h3>Choice Properties</h3>
            <span class="section-meta">Edge</span>
          </div>

          <div class="form-group">
            <label for="edge-label">Choice Label</label>
            <input id="edge-label" v-model="selectedEdge.choice_label" @change="saveEdge" />
          </div>

          <div class="form-group">
            <label for="edge-description">Description</label>
            <input id="edge-description" v-model="selectedEdge.choice_description" @change="saveEdge" />
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="edge-trigger">Show at (ms)</label>
              <input id="edge-trigger" v-model.number="selectedEdge.trigger_at_ms" type="number" min="0" @change="saveEdge" />
            </div>

            <div class="form-group">
              <label for="edge-hide">Hide at (ms)</label>
              <input id="edge-hide" v-model.number="selectedEdge.hide_at_ms" type="number" min="0" @change="saveEdge" />
            </div>
          </div>

          <div class="form-group">
            <label for="edge-color">Text Color</label>
            <div class="color-picker-row">
              <input
                id="edge-color"
                v-model="selectedEdge.choice_color"
                type="color"
                class="color-input"
                @change="saveEdge"
              />
              <span class="color-preview" :style="{ color: selectedEdge.choice_color || '#ffffff' }">
                {{ selectedEdge.choice_color || '#ffffff' }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="selectedEdge.return_to_source"
                @change="saveEdge"
              />
              Return after playing
            </label>
            <span class="form-hint">Viewer returns to this node after watching the target</span>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="edge-set-var">Set Variable</label>
              <input
                id="edge-set-var"
                v-model="selectedEdge.set_variable"
                placeholder="e.g. has_key"
                @change="saveEdge"
              />
            </div>

            <div class="form-group">
              <label for="edge-req-var">Require Variable</label>
              <input
                id="edge-req-var"
                v-model="selectedEdge.require_variable"
                placeholder="e.g. has_key"
                @change="saveEdge"
              />
            </div>
          </div>

          <button class="btn btn-danger full-width" @click="handleDeleteEdge">
            Delete Choice
          </button>
        </section>

        <section v-if="!selectedNode && !selectedEdge" class="sidebar-section helper-card">
          <div class="section-header">
            <h3>Project Settings</h3>
          </div>
          <div class="form-group">
            <label for="project-theme">Theme Color</label>
            <div class="color-picker-row">
              <input
                id="project-theme"
                v-model="projectThemeColor"
                type="color"
                class="color-input"
                @change="saveProjectTheme"
              />
              <span class="color-preview" :style="{ color: projectThemeColor || '#3b82f6' }">
                {{ projectThemeColor || '#3b82f6' }}
              </span>
            </div>
          </div>
          
          <h3 style="margin-top:24px;">Story Builder</h3>
          <p>Select a node or edge to edit it. Use the graph tools to move nodes, pan, zoom, duplicate beats, and test branches faster.</p>
        </section>
      </aside>

      <main class="editor-main">
        <section v-show="!isTimelineCollapsed" class="timeline-panel">
          <div class="timeline-panel-header">
            <div>
              <p class="timeline-kicker">Story Timeline</p>
              <h3>Longest Path {{ formatTimestamp(storyTimeline.longestRuntimeMs) }}</h3>
            </div>

            <div class="timeline-summary">
              <span>{{ storyTimeline.segments.length }} clips</span>
              <span>{{ storyTimeline.choiceCount }} choices</span>
            </div>
          </div>

          <div v-if="storyTimeline.segments.length === 0" class="timeline-empty">
            Add clips and connections to see the story timeline.
          </div>

          <div v-else class="story-timeline">
            <div
              class="timeline-scroll"
              tabindex="0"
              role="region"
              aria-label="Story timeline. Scroll horizontally to inspect clip timing and branching points."
            >
              <div
                class="timeline-canvas"
                :style="{
                  width: `${storyTimeline.canvasWidthPx}px`,
                  height: `${storyTimeline.canvasHeightPx}px`,
                }"
              >
                <div class="timeline-axis">
                  <span
                    v-for="tick in timelineTicks"
                    :key="tick.timeMs"
                    class="timeline-tick"
                    :style="{ left: `${toTimelinePx(tick.timeMs)}px` }"
                  >
                    <span class="timeline-tick-label">{{ formatTimestamp(tick.timeMs) }}</span>
                  </span>
                </div>

                <div class="timeline-master-track" />

                <button
                  v-for="segment in storyTimeline.segments"
                  :key="segment.nodeId"
                  class="timeline-master-segment"
                  type="button"
                  :title="`${segment.label} · ${formatTimestamp(segment.startMs)} to ${formatTimestamp(segment.startMs + segment.durationMs)}`"
                  :style="{
                    left: `${toTimelinePx(segment.startMs)}px`,
                    top: `${storyTimeline.trackTopPx + segment.laneIndex * storyTimeline.laneHeightPx}px`,
                    width: `${Math.max(toTimelinePx(segment.durationMs), 26)}px`,
                    background: segment.color,
                  }"
                  @click="focusNode(segment.nodeId)"
                >
                  <span>{{ segment.label }}</span>
                </button>

                <button
                  v-for="marker in storyTimeline.markers"
                  :key="marker.id"
                  class="timeline-master-marker"
                  type="button"
                  :title="`${marker.label} at ${formatTimestamp(marker.absoluteMs)}`"
                  :style="{ left: `${toTimelinePx(marker.absoluteMs)}px` }"
                  @click="focusEdge(marker.id)"
                >
                  <span class="timeline-marker-label">{{ marker.label }}</span>
                  <span class="timeline-choice-dot" />
                </button>
              </div>
            </div>

            <div class="timeline-legend">
              <button
                v-for="segment in storyTimeline.segments"
                :key="`${segment.nodeId}-legend`"
                class="timeline-legend-item"
                type="button"
                @click="focusNode(segment.nodeId)"
              >
                <span class="timeline-legend-swatch" :style="{ background: segment.color }" />
                <span class="timeline-legend-copy">
                  {{ segment.label }} · {{ formatTimestamp(segment.durationMs) }}
                </span>
              </button>
            </div>
          </div>
        </section>

        <div class="editor-canvas">
          <NodeCanvas
            ref="canvasRef"
            :project-id="projectId"
            @node-select="handleNodeSelect"
            @edge-select="handleEdgeSelect"
          />
        </div>
      </main>
    </div>

    <div v-if="showUploadModal" class="modal-overlay" @click.self="closeUploadModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Upload Live Photo Video</h2>
          <button class="modal-close" type="button" @click="closeUploadModal">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
          </button>
        </div>
        <p class="modal-copy">Use the MOV clip from an iPhone Live Photo, or upload a regular MP4 clip.</p>

        <button
          class="upload-area"
          :class="{ 'drag-over': isDragOver }"
          type="button"
          @click="triggerFileInput"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @drop.prevent="handleDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".mov,.mp4,.heic,video/*"
            hidden
            @change="handleFileSelect"
          />
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" fill="currentColor"/>
          </svg>
          <strong>{{ isDragOver ? 'Drop file here' : 'Choose a file' }}</strong>
          <span>MOV from Live Photos works best. MP4 is also supported.</span>
        </button>

        <div v-if="selectedFile" class="selected-file">
          <div>
            <strong>{{ selectedFile.name }}</strong>
            <p>{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <button class="btn btn-primary" :disabled="isUploading" @click="handleUploadFile">
            {{ isUploading ? 'Uploading...' : 'Upload' }}
          </button>
        </div>

        <p v-if="uploadError" class="error-message">{{ uploadError }}</p>
      </div>
    </div>

    <div v-if="showThumbnailModal && thumbnailClip" class="modal-overlay" @click.self="closeThumbnailModal">
      <div class="modal thumbnail-modal">
        <div class="modal-header">
          <h2>Create Thumbnail</h2>
          <button class="modal-close" type="button" @click="closeThumbnailModal">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
          </button>
        </div>
        <p class="modal-copy">
          Scrub to the frame you want to use, then save it as the clip thumbnail and optionally the published cover.
        </p>

        <div class="thumbnail-player-shell">
          <video
            ref="thumbnailVideoElement"
            class="thumbnail-video"
            :src="thumbnailClip.stream_url"
            controls
            playsinline
            preload="metadata"
            @loadedmetadata="handleThumbnailLoaded"
            @timeupdate="handleThumbnailTimeUpdate"
          />
        </div>

        <div class="form-group">
          <label for="thumbnail-frame">Thumbnail Frame</label>
          <input
            id="thumbnail-frame"
            v-model.number="thumbnailTimeMs"
            type="range"
            min="0"
            :max="thumbnailDurationMs"
            step="100"
            @input="syncThumbnailVideoToSlider"
          />
          <div class="thumbnail-meta-row">
            <span>{{ formatTimestamp(thumbnailTimeMs) }}</span>
            <button type="button" class="text-btn" @click="useCurrentVideoFrame">
              Use current frame
            </button>
          </div>
        </div>

        <label class="checkbox thumbnail-checkbox">
          <input v-model="setAsProjectThumbnail" type="checkbox" />
          Use this image as the published cover
        </label>

        <p v-if="thumbnailError" class="error-message">{{ thumbnailError }}</p>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="closeThumbnailModal">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="isSavingThumbnail"
            @click="handleGenerateThumbnail"
          >
            {{ isSavingThumbnail ? 'Saving...' : 'Save Thumbnail' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import NodeCanvas from '../components/editor/NodeCanvas.vue'
import { mediaApi } from '../api/client'
import { useGraphStore, type Edge, type MediaClip, type Node } from '../stores/graphStore'
import { useToastStore } from '../stores/toastStore'
import { useProjectStore } from '../stores/projectStore'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const graphStore = useGraphStore()
const toastStore = useToastStore()
type NodeCanvasExposed = {
  revealNode: (nodeId: string) => Promise<void> | void
  revealEdge: (edgeId: string) => Promise<void> | void
  fitView: () => Promise<void> | void
  focusStartNode: () => Promise<void> | void
}

const projectId = route.params.id as string
const projectTitle = ref('')
const projectThemeColor = ref('#3b82f6')
const canvasRef = ref<NodeCanvasExposed | null>(null)
const showUploadModal = ref(false)
const showThumbnailModal = ref(false)
const isSidebarCollapsed = ref(false)
const isTimelineCollapsed = ref(false)
const selectedFile = ref<File | null>(null)
const isUploading = ref(false)
const isSavingThumbnail = ref(false)
const uploadError = ref('')
const thumbnailError = ref('')
const isDragOver = ref(false)
const saveStatus = ref<'saving' | 'saved' | ''>('')
const fileInput = ref<HTMLInputElement | null>(null)
const thumbnailVideoElement = ref<HTMLVideoElement | null>(null)
const thumbnailClipId = ref('')
const thumbnailTimeMs = ref(0)
const thumbnailDurationMs = ref(0)
const setAsProjectThumbnail = ref(true)
const isPublishing = ref(false)

const selectedNode = computed(() => graphStore.selectedNode)
const selectedEdge = computed(() => graphStore.selectedEdge)
const nodes = computed(() => graphStore.nodes)
const edges = computed(() => graphStore.edges)
const mediaClips = computed(() => graphStore.mediaClips)
const currentProjectThumbnailUrl = computed(() => projectStore.currentProject?.thumbnail_url || '')
const isPublished = computed(() => Boolean(projectStore.currentProject?.is_published))
const thumbnailClip = computed(() =>
  mediaClips.value.find((clip) => clip.id === thumbnailClipId.value) || null
)

interface TimelineMarker {
  id: string
  label: string
  absoluteMs: number
}

interface TimelineSegment {
  nodeId: string
  label: string
  nodeType: Node['node_type']
  mediaName: string
  startMs: number
  durationMs: number
  color: string
  laneIndex: number
}

interface ChoiceEditorItem extends Edge {
  sourceLabel: string
  targetLabel: string
  absoluteTriggerMs: number
}

const timelinePalette = [
  'linear-gradient(135deg, #38bdf8, #0ea5e9)',
  'linear-gradient(135deg, #f97316, #ef4444)',
  'linear-gradient(135deg, #22c55e, #16a34a)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
  'linear-gradient(135deg, #a855f7, #ec4899)',
  'linear-gradient(135deg, #14b8a6, #06b6d4)',
]

function getNodeDuration(node: Node): number {
  const absoluteEndTime = node.end_time_ms ?? node.media_clip?.duration_ms ?? 0
  return Math.max(absoluteEndTime - node.start_time_ms, 0)
}

function getChoiceAbsoluteTime(edge: Edge, sourceNode?: Node): number {
  const sourceStart = sourceNode ? earliestStartMap.value.get(sourceNode.id) ?? 0 : 0
  const sourceDuration = sourceNode ? getNodeDuration(sourceNode) : 0
  const triggerAtMs = edge.trigger_at_ms && edge.trigger_at_ms > 0
    ? Math.min(edge.trigger_at_ms, sourceDuration || edge.trigger_at_ms)
    : sourceDuration

  return sourceStart + triggerAtMs
}

const outgoingEdgesByNode = computed(() => {
  const grouped = new Map<string, Edge[]>()

  for (const edge of edges.value) {
    const existing = grouped.get(edge.source_node_id)

    if (existing) {
      existing.push(edge)
      continue
    }

    grouped.set(edge.source_node_id, [edge])
  }

  for (const entry of grouped.values()) {
    entry.sort((left, right) => left.display_order - right.display_order)
  }

  return grouped
})

const startNode = computed(() =>
  nodes.value.find((node) => node.node_type === 'start') || nodes.value[0] || null
)

const earliestStartMap = computed(() => {
  const starts = new Map<string, number>()
  const rootNode = startNode.value

  if (!rootNode) {
    return starts
  }

  starts.set(rootNode.id, 0)
  const queue = [rootNode.id]
  let guard = 0

  while (queue.length > 0 && guard < 5000) {
    guard += 1
    const nodeId = queue.shift()

    if (!nodeId) {
      continue
    }

    const node = nodes.value.find((entry) => entry.id === nodeId)

    if (!node) {
      continue
    }

    const nextStart = (starts.get(nodeId) ?? 0) + getNodeDuration(node)
    const outgoing = outgoingEdgesByNode.value.get(nodeId) ?? []

    for (const edge of outgoing) {
      const previousStart = starts.get(edge.target_node_id)

      if (previousStart === undefined || nextStart < previousStart) {
        starts.set(edge.target_node_id, nextStart)
        queue.push(edge.target_node_id)
      }
    }
  }

  return starts
})

const longestRuntimeMs = computed(() => {
  const rootNode = startNode.value

  if (!rootNode) {
    return 0
  }

  const memo = new Map<string, number>()

  const walk = (nodeId: string, visiting: Set<string>): number => {
    if (memo.has(nodeId)) {
      return memo.get(nodeId) ?? 0
    }

    const node = nodes.value.find((entry) => entry.id === nodeId)

    if (!node) {
      return 0
    }

    if (visiting.has(nodeId)) {
      return getNodeDuration(node)
    }

    visiting.add(nodeId)
    const duration = getNodeDuration(node)
    const outgoing = outgoingEdgesByNode.value.get(nodeId) ?? []
    let tail = 0

    for (const edge of outgoing) {
      tail = Math.max(tail, walk(edge.target_node_id, visiting))
    }

    visiting.delete(nodeId)
    const total = duration + tail
    memo.set(nodeId, total)
    return total
  }

  return walk(rootNode.id, new Set())
})

const storyTimeline = computed(() => {
  const baseSegments = nodes.value
    .filter((node) => earliestStartMap.value.has(node.id))
    .map((node, index) => ({
      nodeId: node.id,
      label: node.label || 'Untitled Node',
      nodeType: node.node_type,
      mediaName: node.media_clip?.original_filename || 'No clip assigned',
      startMs: earliestStartMap.value.get(node.id) ?? 0,
      durationMs: getNodeDuration(node),
      color: timelinePalette[index % timelinePalette.length],
    }))
    .sort((left, right) => left.startMs - right.startMs || left.label.localeCompare(right.label))

  const laneEndTimes: number[] = []
  const segments: TimelineSegment[] = baseSegments.map((segment) => {
    const segmentEnd = segment.startMs + Math.max(segment.durationMs, 1)
    let laneIndex = laneEndTimes.findIndex((laneEnd) => laneEnd <= segment.startMs)

    if (laneIndex === -1) {
      laneIndex = laneEndTimes.length
      laneEndTimes.push(segmentEnd)
    } else {
      laneEndTimes[laneIndex] = segmentEnd
    }

    return {
      ...segment,
      laneIndex,
    }
  })

  const markers: TimelineMarker[] = segments.flatMap((segment) => {
    const sourceNode = nodes.value.find((node) => node.id === segment.nodeId)

    return (outgoingEdgesByNode.value.get(segment.nodeId) ?? []).map((edge) => ({
      id: edge.id,
      label: edge.choice_label || 'Choice',
      absoluteMs: getChoiceAbsoluteTime(edge, sourceNode),
    }))
  })

  const choiceCount = markers.length
  const maxRowEndMs = segments.reduce((max, segment) => Math.max(max, segment.startMs + segment.durationMs), 0)
  const maxMarkerMs = markers.reduce((max, marker) => Math.max(max, marker.absoluteMs), 0)
  const maxVisibleMs = Math.max(longestRuntimeMs.value, maxRowEndMs, maxMarkerMs, 1000)
  const pixelsPerSecond = 170
  const canvasWidthPx = Math.max(Math.ceil((maxVisibleMs / 1000) * pixelsPerSecond), 900)
  const laneHeightPx = 42
  const trackTopPx = 60
  const canvasHeightPx = trackTopPx + Math.max(laneEndTimes.length, 1) * laneHeightPx + 18

  return {
    segments,
    markers,
    choiceCount,
    longestRuntimeMs: longestRuntimeMs.value,
    maxVisibleMs,
    canvasWidthPx,
    canvasHeightPx,
    trackTopPx,
    laneHeightPx,
  }
})

const timelineTicks = computed(() => {
  const maxVisibleMs = storyTimeline.value.maxVisibleMs
  const tickCount = 6

  return Array.from({ length: tickCount + 1 }, (_, index) => ({
    timeMs: Math.round((maxVisibleMs / tickCount) * index),
  }))
})

const choiceEditorItems = computed<ChoiceEditorItem[]>(() =>
  edges.value
    .map((edge) => {
      const sourceNode = nodes.value.find((node) => node.id === edge.source_node_id)
      const targetNode = nodes.value.find((node) => node.id === edge.target_node_id)

      return {
        ...edge,
        sourceLabel: sourceNode?.label || 'Unknown',
        targetLabel: targetNode?.label || 'Unknown',
        absoluteTriggerMs: getChoiceAbsoluteTime(edge, sourceNode),
      }
    })
    .sort((left, right) => left.absoluteTriggerMs - right.absoluteTriggerMs || left.display_order - right.display_order)
)

onMounted(async () => {
  const project = await projectStore.fetchProject(projectId)

  if (project) {
    projectTitle.value = project.title
  }

  await graphStore.loadGraph(projectId)
  await nextTick()
  await canvasRef.value?.fitView()
})

function handleNodeSelect(nodeId: string | null) {
  graphStore.selectNode(nodeId)
}

function handleEdgeSelect(edgeId: string | null) {
  graphStore.selectEdge(edgeId)
}

async function saveProjectTheme() {
  if (!projectStore.currentProject) return
  saveStatus.value = 'saving'
  const updated = await projectStore.updateProject(projectId, {
    theme_color: projectThemeColor.value
  })

  if (updated) {
    saveStatus.value = 'saved'
    setTimeout(() => { saveStatus.value = '' }, 2000)
  } else {
    saveStatus.value = ''
    toastStore.error('Failed to save project theme')
  }
}

async function saveTitle() {
  const trimmedTitle = projectTitle.value.trim()

  if (trimmedTitle) {
    projectTitle.value = trimmedTitle
    saveStatus.value = 'saving'
    await projectStore.updateProject(projectId, { title: trimmedTitle })
    showSaved()
  }
}

async function handlePublishToggle() {
  isPublishing.value = true

  try {
    if (isPublished.value) {
      await projectStore.unpublishProject(projectId)
      toastStore.info('Project unpublished')
    } else {
      const result = await projectStore.publishProject(projectId)

      if (!result) {
        toastStore.error(projectStore.error || 'Failed to publish')
        return
      }

      toastStore.success('Project published!')
    }
  } finally {
    isPublishing.value = false
  }
}

function showSaved() {
  saveStatus.value = 'saved'
  setTimeout(() => { saveStatus.value = '' }, 2000)
}

async function saveNode() {
  if (selectedNode.value) {
    const nodeId = selectedNode.value.id
    saveStatus.value = 'saving'
    await graphStore.updateNode(selectedNode.value.id, {
      ...selectedNode.value,
      media_clip_id: selectedNode.value.media_clip_id || null,
      end_time_ms: selectedNode.value.end_time_ms ?? null,
      auto_advance_ms: selectedNode.value.auto_advance_ms ?? null,
    })
    await graphStore.loadGraph(projectId)
    graphStore.selectNode(nodeId)
    showSaved()
  }
}

async function saveEdge() {
  if (selectedEdge.value) {
    saveStatus.value = 'saving'
    await graphStore.updateEdge(selectedEdge.value.id, selectedEdge.value)
    showSaved()
  }
}

async function saveChoiceItem(choice: Edge) {
  await graphStore.updateEdge(choice.id, {
    ...choice,
    hide_at_ms: choice.hide_at_ms ?? null,
  })
}

async function handleDeleteNode() {
  if (!selectedNode.value || !confirm('Delete this node?')) {
    return
  }

  await graphStore.deleteNode(selectedNode.value.id)
}

async function handleDeleteEdge() {
  if (!selectedEdge.value || !confirm('Delete this choice?')) {
    return
  }

  await graphStore.deleteEdge(selectedEdge.value.id)
}

function handlePreview() {
  router.push(`/projects/${projectId}/view`)
}

function handlePreviewFromSelected() {
  if (!selectedNode.value) {
    handlePreview()
    return
  }

  router.push({
    path: `/projects/${projectId}/view`,
    query: { node: selectedNode.value.id },
  })
}

function focusNode(nodeId: string) {
  graphStore.selectNode(nodeId)
  void nextTick(() => canvasRef.value?.revealNode(nodeId))
}

function focusEdge(edgeId: string) {
  graphStore.selectEdge(edgeId)
  void nextTick(() => canvasRef.value?.revealEdge(edgeId))
}

function openUploadModal() {
  showUploadModal.value = true
  uploadError.value = ''
}

function closeUploadModal() {
  showUploadModal.value = false
  selectedFile.value = null
  uploadError.value = ''
}

function openThumbnailModal(clip: MediaClip) {
  thumbnailClipId.value = clip.id
  thumbnailTimeMs.value = 0
  thumbnailDurationMs.value = clip.duration_ms || 0
  setAsProjectThumbnail.value = true
  thumbnailError.value = ''
  isSavingThumbnail.value = false
  showThumbnailModal.value = true
}

function closeThumbnailModal() {
  thumbnailVideoElement.value?.pause()
  showThumbnailModal.value = false
  thumbnailClipId.value = ''
  thumbnailTimeMs.value = 0
  thumbnailDurationMs.value = 0
  thumbnailError.value = ''
  setAsProjectThumbnail.value = true
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0] || null
}

function handleDrop(event: DragEvent) {
  isDragOver.value = false
  const file = event.dataTransfer?.files[0]

  if (file) {
    selectedFile.value = file
  }
}

async function handleUploadFile() {
  if (!selectedFile.value) {
    return
  }

  isUploading.value = true
  uploadError.value = ''

  try {
    await mediaApi.upload(selectedFile.value, projectId)
    await graphStore.loadGraph(projectId)
    closeUploadModal()
    toastStore.success('Media uploaded successfully')
  } catch (error: any) {
    uploadError.value = error.response?.data?.error || 'Upload failed'
  } finally {
    isUploading.value = false
  }
}

function createNodeLabelFromClip(clip: MediaClip) {
  return clip.original_filename.replace(/\.[^.]+$/, '') || 'Clip Node'
}

async function createNodeFromClip(clip: MediaClip) {
  const anchorNode = selectedNode.value ?? startNode.value ?? nodes.value[nodes.value.length - 1] ?? null
  const durationMs = clip.duration_ms ?? 0
  const nextNode = await graphStore.createNode({
    project_id: projectId,
    label: createNodeLabelFromClip(clip),
    node_type: 'clip',
    media_clip_id: clip.id,
    start_time_ms: 0,
    end_time_ms: durationMs || null,
    is_ending: false,
    position_x: (anchorNode?.position_x ?? 180) + 240,
    position_y: (anchorNode?.position_y ?? 160) + 48,
  })

  if (!nextNode) {
    return
  }

  graphStore.selectNode(nextNode.id)
  await nextTick()
  await canvasRef.value?.revealNode(nextNode.id)
}

function handleThumbnailLoaded() {
  if (!thumbnailVideoElement.value) {
    return
  }

  thumbnailDurationMs.value = Math.round(thumbnailVideoElement.value.duration * 1000)
  syncThumbnailVideoToSlider()
}

function handleThumbnailTimeUpdate() {
  if (!thumbnailVideoElement.value) {
    return
  }

  thumbnailTimeMs.value = Math.round(thumbnailVideoElement.value.currentTime * 1000)
}

function syncThumbnailVideoToSlider() {
  if (!thumbnailVideoElement.value) {
    return
  }

  thumbnailVideoElement.value.currentTime = thumbnailTimeMs.value / 1000
}

function useCurrentVideoFrame() {
  if (!thumbnailVideoElement.value) {
    return
  }

  thumbnailTimeMs.value = Math.round(thumbnailVideoElement.value.currentTime * 1000)
}

async function handleGenerateThumbnail() {
  if (!thumbnailClip.value) {
    return
  }

  isSavingThumbnail.value = true
  thumbnailError.value = ''

  try {
    await mediaApi.createThumbnail(thumbnailClip.value.id, {
      time_ms: thumbnailTimeMs.value,
      set_as_project_thumbnail: setAsProjectThumbnail.value,
    })
    await graphStore.loadGraph(projectId)
    await projectStore.fetchProject(projectId)
    closeThumbnailModal()
  } catch (error: any) {
    thumbnailError.value = error.response?.data?.error || 'Unable to create thumbnail'
  } finally {
    isSavingThumbnail.value = false
  }
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function toTimelinePx(timeMs: number): number {
  if (storyTimeline.value.maxVisibleMs <= 0) {
    return 0
  }

  return Math.min(
    (timeMs / storyTimeline.value.maxVisibleMs) * storyTimeline.value.canvasWidthPx,
    storyTimeline.value.canvasWidthPx
  )
}
</script>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - var(--app-header-height, 62px));
  margin: -24px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 38%),
    #111827;
  border-bottom: 1px solid #243145;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.project-heading {
  min-width: 0;
}

.project-hint {
  font-size: 12px;
  color: #8ea3bf;
  margin-top: 2px;
}

.project-subtitle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.save-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  animation: fadeInBadge 0.2s ease;
}

.save-badge.saving {
  color: #fcd34d;
  background: rgba(252, 211, 77, 0.12);
}

.save-badge.saved {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.12);
}

@keyframes fadeInBadge {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.back-btn {
  color: #94a3b8;
  padding: 8px;
  border-radius: 999px;
  transition: background 0.2s, color 0.2s;
}

.back-btn:hover {
  background: rgba(148, 163, 184, 0.12);
  color: #f8fafc;
}

.title-input {
  background: transparent;
  border: none;
  font-size: 1.15rem;
  font-weight: 700;
  color: #f8fafc;
  width: min(360px, 44vw);
  padding: 0;
}

.title-input:focus {
  outline: none;
  background: rgba(15, 23, 42, 0.85);
  border-radius: 8px;
  padding: 6px 10px;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.header-panel-toggles,
.header-primary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.editor-page .btn {
  padding: 7px 12px;
  font-size: 12px;
}

.btn-compact {
  min-height: 34px;
}

.panel-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  padding: 7px 11px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.82);
  color: #9fb0c8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.panel-toggle:hover {
  background: rgba(22, 32, 51, 0.96);
  color: #f8fafc;
}

.panel-toggle.active {
  background: rgba(8, 47, 73, 0.92);
  border-color: rgba(56, 189, 248, 0.3);
  color: #dff9ff;
}

.editor-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.editor-sidebar {
  width: 264px;
  background: #111827;
  border-right: 1px solid #243145;
  padding: 12px;
  overflow-y: auto;
  min-height: 0;
  transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1), padding 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.sidebar-section {
  background: #162033;
  border: 1px solid #243145;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 10px;
}

.section-header h3 {
  font-size: 13px;
  font-weight: 700;
  color: #cbd5e1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-meta {
  font-size: 12px;
  color: #8ea3bf;
}

.helper-card p,
.modal-copy,
.empty-media p {
  color: #9fb0c8;
  line-height: 1.5;
}

.empty-media {
  display: grid;
  gap: 12px;
}

.media-list {
  display: grid;
  gap: 10px;
}

.media-item {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background: #0f172a;
  border: 1px solid #23304a;
  border-radius: 12px;
}

.media-item.processing {
  opacity: 0.72;
}

.media-item img,
.media-placeholder {
  width: 56px;
  height: 42px;
  border-radius: 8px;
}

.media-item img {
  object-fit: cover;
}

.media-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e293b;
  color: #64748b;
}

.media-copy {
  min-width: 0;
}

.media-actions {
  display: grid;
  gap: 6px;
  justify-items: end;
}

.media-name,
.media-status {
  display: block;
}

.media-name {
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-status {
  margin-top: 4px;
  font-size: 11px;
  color: #8ea3bf;
  text-transform: capitalize;
}

.media-tool-btn {
  border: 1px solid rgba(255, 77, 109, 0.35);
  background: rgba(255, 77, 109, 0.1);
  color: #ffe4e6;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.media-tool-btn:hover {
  background: rgba(255, 77, 109, 0.18);
}

.cover-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.14);
  color: #bbf7d0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-input {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.color-preview {
  font-family: monospace;
  font-size: 12px;
  opacity: 0.7;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #e2e8f0;
}

.checkbox-label input[type="checkbox"] {
  accent-color: #38bdf8;
}

.form-hint {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}

.choice-editor-list {
  display: grid;
  gap: 10px;
}

.choice-editor-item {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #23304a;
  background: #0f172a;
  cursor: pointer;
}

.choice-editor-item.active {
  border-color: rgba(56, 189, 248, 0.55);
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.18);
}

.choice-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.choice-route,
.choice-time {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.choice-route {
  color: #cbd5e1;
  min-width: 0;
  flex: 1 1 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choice-time {
  color: #7dd3fc;
}

.choice-name-input {
  background: rgba(2, 6, 23, 0.42);
}

.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e2e8f0;
}

.checkbox input {
  width: auto;
}

.full-width {
  width: 100%;
}

.editor-canvas {
  flex: 1;
  min-height: clamp(36rem, 72dvh, 62rem);
  overflow: hidden;
}

.timeline-panel {
  padding: 10px 12px;
  background:
    linear-gradient(180deg, rgba(8, 17, 31, 0.96), rgba(8, 17, 31, 0.84)),
    #08111f;
  border-bottom: 1px solid #243145;
}

.timeline-panel-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.timeline-kicker {
  color: #7dd3fc;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 10px;
  font-weight: 700;
  margin-bottom: 4px;
}

.timeline-panel h3 {
  font-size: 1rem;
  color: #f8fafc;
}

.timeline-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.timeline-summary span {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.12);
  color: #cbd5e1;
  font-size: 11px;
}

.timeline-empty {
  color: #8ea3bf;
  font-size: 14px;
}

.story-timeline {
  display: grid;
  gap: 10px;
}

.timeline-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 6px;
  scrollbar-gutter: stable;
}

.timeline-scroll:focus-visible {
  border-radius: 24px;
}

.timeline-canvas {
  position: relative;
  min-width: 100%;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.55)),
    #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.timeline-axis {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
}

.timeline-tick {
  position: absolute;
  top: 18px;
  bottom: 14px;
  width: 1px;
  background: rgba(148, 163, 184, 0.12);
}

.timeline-tick:first-child,
.timeline-tick:last-child {
  background: rgba(148, 163, 184, 0.18);
}

.timeline-tick-label {
  position: absolute;
  top: -16px;
  left: 8px;
  color: #64748b;
  font-size: 11px;
  white-space: nowrap;
}

.timeline-master-track {
  position: relative;
  margin: 38px 12px 12px;
  height: calc(100% - 50px);
  min-height: 68px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(2, 6, 23, 0.16), rgba(2, 6, 23, 0.08)),
    #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.timeline-master-segment {
  position: absolute;
  height: 24px;
  min-width: 18px;
  border: none;
  border-radius: 10px;
  color: #ecfdf5;
  padding: 0 10px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 12px 24px rgba(2, 6, 23, 0.28);
}

.timeline-master-segment span {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  font-weight: 700;
  line-height: 24px;
}

.timeline-master-marker {
  position: absolute;
  top: 38px;
  bottom: 12px;
  width: 16px;
  transform: translateX(-50%);
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.timeline-master-marker::before {
  content: '';
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: rgba(255, 77, 109, 0.86);
  box-shadow: 0 0 10px rgba(255, 77, 109, 0.45);
}

.timeline-marker-label {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  color: #fda4af;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}

.timeline-master-marker:hover .timeline-marker-label,
.timeline-master-marker:focus-visible .timeline-marker-label {
  opacity: 1;
}

.timeline-choice-dot {
  position: absolute;
  left: 50%;
  top: 3px;
  width: 9px;
  height: 9px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #ffe4e6;
  border: 2px solid rgba(255, 77, 109, 0.92);
  box-shadow: 0 0 12px rgba(255, 77, 109, 0.45);
}

.timeline-legend {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  scrollbar-gutter: stable;
}

.timeline-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.88);
  color: #cbd5e1;
  cursor: pointer;
}

.timeline-legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  box-shadow: 0 0 10px rgba(15, 23, 42, 0.22);
}

.timeline-legend-copy {
  font-size: 11px;
  font-weight: 700;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.74);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal {
  width: min(520px, 100%);
  background: #111827;
  border: 1px solid #243145;
  border-radius: 24px;
  padding: 28px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.55);
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
  margin-bottom: 12px;
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

.modal h2 {
  margin-bottom: 10px;
}

.thumbnail-modal {
  width: min(720px, 100%);
}

.thumbnail-player-shell {
  margin-top: 18px;
  border-radius: 20px;
  overflow: hidden;
  background: #020617;
  border: 1px solid #243145;
}

.thumbnail-video {
  width: 100%;
  max-height: 58vh;
  display: block;
  background: #000;
}

.thumbnail-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  color: #9fb0c8;
  font-size: 13px;
}

.thumbnail-checkbox {
  margin-top: 8px;
}

.text-btn {
  background: transparent;
  border: none;
  color: #7dd3fc;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
}

.text-btn:hover {
  color: #bae6fd;
}

.upload-area {
  width: 100%;
  margin-top: 20px;
  padding: 40px 24px;
  border: 2px dashed #34507a;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.08), rgba(15, 23, 42, 0.4));
  color: #f8fafc;
  display: grid;
  gap: 10px;
  justify-items: center;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease;
}

.upload-area:hover {
  border-color: #5b8dd6;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.14), rgba(15, 23, 42, 0.5));
}

.upload-area.drag-over {
  border-color: #38bdf8;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.16), rgba(15, 23, 42, 0.6));
  animation: pulse-border 1s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: #38bdf8; }
  50% { border-color: #7dd3fc; }
}

.upload-area svg {
  color: #8ea3bf;
}

.upload-area span {
  color: #9fb0c8;
  font-size: 13px;
}

.selected-file {
  margin-top: 16px;
  padding: 14px 16px;
  background: #0f172a;
  border: 1px solid #23304a;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.selected-file p {
  margin-top: 4px;
  color: #8ea3bf;
  font-size: 13px;
}

.error-message {
  margin-top: 14px;
  color: #fca5a5;
  font-size: 14px;
}

@media (max-width: 1100px) {
  .editor-layout {
    flex-direction: column;
  }

  .editor-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #243145;
  }

  .media-item {
    grid-template-columns: 56px 1fr;
  }

  .media-actions {
    grid-column: 1 / -1;
    grid-auto-flow: column;
    justify-content: start;
  }

  .timeline-panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-start;
  }
}

.publish-status-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.publish-status-badge.published {
  background: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.publish-status-badge.draft {
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.15);
}

.btn-publish {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #00201a;
}

.btn-publish:hover {
  filter: brightness(1.1);
}
</style>

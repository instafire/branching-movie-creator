<template>
  <div
    ref="canvasContainer"
    class="node-canvas"
    :class="{
      'pan-active': isPanMode,
      'node-move-active': Boolean(activeNodeMove),
    }"
    tabindex="0"
    role="region"
    aria-label="Story canvas. Double-click a node to move it. Click empty graph once to pan and click again to release. Use zoom controls or Control plus mouse wheel to zoom."
    @wheel="handleCanvasWheel"
    @keydown="handleCanvasKeydown"
  >
    <span class="sr-only" aria-live="polite">{{ interactionHint }}</span>

    <div
      ref="canvasSurface"
      class="node-surface"
      :style="{
        width: `${scaledSurfaceSize.width}px`,
        height: `${scaledSurfaceSize.height}px`,
        '--grid-size': `${32 * scale}px`,
      }"
      @click.self="handleSurfaceClick"
    >
      <svg
        class="edges-layer"
        :width="scaledSurfaceSize.width"
        :height="scaledSurfaceSize.height"
        :viewBox="`0 0 ${surfaceSize.width} ${surfaceSize.height}`"
        preserveAspectRatio="none"
        @click.self="handleSurfaceClick"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
        </defs>

        <g v-for="edge in renderedEdges" :key="edge.id">
          <path
            :d="getEdgePath(edge)"
            class="edge-line"
            :class="{ selected: selectedEdgeId === edge.id }"
            marker-end="url(#arrowhead)"
            @click.stop="$emit('edge-select', edge.id)"
          />
          <text
            :x="getEdgeLabelPosition(edge).x"
            :y="getEdgeLabelPosition(edge).y"
            class="edge-label"
            @click.stop="$emit('edge-select', edge.id)"
          >
            {{ edge.choice_label }}
          </text>
        </g>

        <path
          v-if="connectionPreview"
          :d="connectionPreview"
          class="edge-preview"
        />
      </svg>

      <div
        class="nodes-layer"
        :style="{
          width: `${surfaceSize.width}px`,
          height: `${surfaceSize.height}px`,
          transform: `scale(${scale})`,
        }"
        @click.self="handleSurfaceClick"
      >
        <div
          v-for="node in nodes"
          :key="node.id"
          :data-node-id="node.id"
          class="node"
          :class="{
            selected: selectedNodeId === node.id,
            moving: activeNodeMove?.nodeId === node.id,
            'start-node': node.node_type === 'start',
            'end-node': node.is_ending,
          }"
          :style="{ left: `${node.position_x}px`, top: `${node.position_y}px` }"
          @click.stop="handleNodeClick(node)"
          @dblclick.stop.prevent="handleNodeDoubleClick($event, node)"
        >
          <div class="node-thumbnail">
            <img v-if="node.media_clip?.thumbnail_url" :src="node.media_clip.thumbnail_url" alt="" />
            <div v-else class="no-thumbnail">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/>
              </svg>
            </div>
            <span v-if="node.media_clip?.duration_ms" class="duration-badge">
              {{ formatDuration(node.media_clip.duration_ms) }}
            </span>
          </div>

          <div class="node-info">
            <span class="node-label">{{ node.label }}</span>
            <span class="node-type">{{ node.node_type }}</span>
            <span v-if="activeNodeMove?.nodeId === node.id" class="node-mode-badge">
              Moving
            </span>
          </div>

          <div
            v-if="node.node_type !== 'end'"
            class="handle handle-right"
            @mousedown.stop="startConnection($event, node, 'right')"
          />
          <div
            v-if="node.node_type !== 'start'"
            class="handle handle-left"
            @mousedown.stop="startConnection($event, node, 'left')"
          />
        </div>
      </div>
    </div>

    <div class="toolbar">
      <button class="toolbar-button" type="button" title="Add node" aria-label="Add node" @click="addNode">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
        Add
      </button>

      <button
        v-if="selectedNode"
        class="toolbar-button"
        type="button"
        title="Duplicate selected node"
        aria-label="Duplicate selected node"
        @click="duplicateSelectedNode"
      >
        Duplicate
      </button>

      <button class="toolbar-button" type="button" title="Focus start node" aria-label="Focus start node" @click="focusStartNode">
        Start
      </button>

      <button
        v-if="selectedNode"
        class="toolbar-button"
        type="button"
        title="Focus selected node"
        aria-label="Focus selected node"
        @click="focusSelectedNode"
      >
        Selected
      </button>

      <button class="toolbar-button" type="button" title="Fit graph to view" aria-label="Fit graph to view" @click="fitView">
        Fit
      </button>

      <button
        v-if="activeNodeMove"
        class="toolbar-button toolbar-toggle active"
        type="button"
        title="Place moving node"
        aria-label="Place moving node"
        @click="releaseNodeMove"
      >
        Place
      </button>

      <button
        class="toolbar-button toolbar-toggle"
        :class="{ active: isPanMode }"
        type="button"
        :title="isPanMode ? 'Stop graph move mode' : 'Move around the graph'"
        :aria-label="isPanMode ? 'Stop graph move mode' : 'Move around the graph'"
        :aria-pressed="isPanMode"
        @click="togglePanMode"
      >
        {{ isPanMode ? 'Stop Pan' : 'Pan' }}
      </button>

      <div class="toolbar-group" role="group" aria-label="Canvas zoom controls">
        <button class="toolbar-icon" type="button" aria-label="Zoom out" @click="zoomOut">
          -
        </button>
        <button class="toolbar-readout" type="button" aria-label="Reset zoom" @click="resetZoom">
          {{ scaleLabel }}
        </button>
        <button class="toolbar-icon" type="button" aria-label="Zoom in" @click="zoomIn">
          +
        </button>
      </div>
    </div>

    <div
      class="minimap-shell"
      role="region"
      aria-label="Graph overview map. Click anywhere to jump across the story graph."
    >
      <div
        class="minimap"
        :style="{ width: `${minimap.width}px`, height: `${minimap.height}px` }"
        @click="handleMinimapClick"
      >
        <div class="minimap-surface">
          <div
            v-for="node in nodes"
            :key="`${node.id}-minimap`"
            class="minimap-node"
            :class="{
              selected: selectedNodeId === node.id,
              start: node.node_type === 'start',
              ending: node.is_ending,
            }"
            :style="{
              left: `${node.position_x * minimap.scale}px`,
              top: `${node.position_y * minimap.scale}px`,
              width: `${Math.max(NODE_WIDTH * minimap.scale, 10)}px`,
              height: `${Math.max(NODE_HEIGHT * minimap.scale, 8)}px`,
            }"
          />
          <div
            class="minimap-viewport"
            :style="{
              left: `${viewportRect.left * minimap.scale}px`,
              top: `${viewportRect.top * minimap.scale}px`,
              width: `${Math.max(viewportRect.width * minimap.scale, 22)}px`,
              height: `${Math.max(viewportRect.height * minimap.scale, 18)}px`,
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

import { useGraphStore, type Edge, type Node } from '../../stores/graphStore'

const props = defineProps<{
  projectId: string
}>()

const emit = defineEmits<{
  (e: 'node-select', nodeId: string | null): void
  (e: 'edge-select', edgeId: string | null): void
}>()

const NODE_WIDTH = 180
const NODE_HEIGHT = 126
const MIN_SCALE = 0.55
const MAX_SCALE = 2.25
const SCALE_STEP = 0.15

type NodeMoveState = {
  nodeId: string
  pointerOffsetX: number
  pointerOffsetY: number
}

const graphStore = useGraphStore()
let resizeObserver: ResizeObserver | null = null

const canvasContainer = ref<HTMLDivElement | null>(null)
const canvasSurface = ref<HTMLDivElement | null>(null)
const scale = ref(1)
const activeNodeMove = ref<NodeMoveState | null>(null)
const isPanMode = ref(false)
const panPointer = ref<{ x: number; y: number } | null>(null)
const viewportWidth = ref(0)
const viewportHeight = ref(0)
const scrollLeft = ref(0)
const scrollTop = ref(0)

const nodes = computed(() => graphStore.nodes)
const edges = computed(() => graphStore.edges)
const selectedNode = computed(() => graphStore.selectedNode)
const selectedNodeId = computed(() => graphStore.selectedNodeId)
const selectedEdgeId = computed(() => graphStore.selectedEdgeId)
const renderedEdges = computed(() => edges.value)
const scaleLabel = computed(() => `${Math.round(scale.value * 100)}%`)
const interactionHint = computed(() => {
  if (activeNodeMove.value) {
    const movingNode = graphStore.getNodeById(activeNodeMove.value.nodeId)
    return `Moving ${movingNode?.label || 'node'}. Move the mouse to reposition it, then click once to place it.`
  }

  if (isPanMode.value) {
    return 'Graph move mode is active. Move the mouse to travel across the graph, then click empty space once to release.'
  }

  return 'Double-click a clip to move it. Click empty graph once to move around the graph. Use the zoom controls or Control plus mouse wheel to zoom.'
})

const surfaceSize = computed(() => {
  const paddingX = 320
  const paddingY = 260
  const minWidth = 1600
  const minHeight = 1000

  const maxX = nodes.value.reduce((currentMax, node) => Math.max(currentMax, node.position_x), 0)
  const maxY = nodes.value.reduce((currentMax, node) => Math.max(currentMax, node.position_y), 0)

  return {
    width: Math.max(minWidth, maxX + NODE_WIDTH + paddingX),
    height: Math.max(minHeight, maxY + NODE_HEIGHT + paddingY),
  }
})

const scaledSurfaceSize = computed(() => ({
  width: Math.ceil(surfaceSize.value.width * scale.value),
  height: Math.ceil(surfaceSize.value.height * scale.value),
}))
const startNode = computed(() =>
  nodes.value.find((node) => node.node_type === 'start') || nodes.value[0] || null
)
const contentBounds = computed(() => {
  if (!nodes.value.length) {
    return {
      left: 0,
      top: 0,
      width: surfaceSize.value.width,
      height: surfaceSize.value.height,
    }
  }

  const left = Math.min(...nodes.value.map((node) => node.position_x))
  const top = Math.min(...nodes.value.map((node) => node.position_y))
  const right = Math.max(...nodes.value.map((node) => node.position_x + NODE_WIDTH))
  const bottom = Math.max(...nodes.value.map((node) => node.position_y + NODE_HEIGHT))

  return {
    left,
    top,
    width: Math.max(right - left, NODE_WIDTH),
    height: Math.max(bottom - top, NODE_HEIGHT),
  }
})
const minimap = computed(() => {
  const targetWidth = 176
  const scaleRatio = targetWidth / surfaceSize.value.width

  return {
    scale: scaleRatio,
    width: targetWidth,
    height: Math.max(surfaceSize.value.height * scaleRatio, 150),
  }
})
const viewportRect = computed(() => ({
  left: scrollLeft.value / scale.value,
  top: scrollTop.value / scale.value,
  width: viewportWidth.value / scale.value,
  height: viewportHeight.value / scale.value,
}))

const connectionStart = ref<{ nodeId: string; handle: 'left' | 'right' } | null>(null)
const connectionPreview = ref<string | null>(null)

onMounted(() => {
  window.addEventListener('mousemove', handleWindowMouseMove)
  window.addEventListener('resize', updateViewportState)

  if (canvasContainer.value) {
    canvasContainer.value.addEventListener('scroll', updateViewportState, { passive: true })

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => updateViewportState())
      resizeObserver.observe(canvasContainer.value)
    }
  }

  updateViewportState()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleWindowMouseMove)
  window.removeEventListener('resize', updateViewportState)
  canvasContainer.value?.removeEventListener('scroll', updateViewportState)
  resizeObserver?.disconnect()
})

function updateViewportState() {
  if (!canvasContainer.value) {
    return
  }

  viewportWidth.value = canvasContainer.value.clientWidth
  viewportHeight.value = canvasContainer.value.clientHeight
  scrollLeft.value = canvasContainer.value.scrollLeft
  scrollTop.value = canvasContainer.value.scrollTop
}

function clearSelection() {
  graphStore.clearSelection()
  emit('node-select', null)
  emit('edge-select', null)
}

function getWorldPointFromClient(clientX: number, clientY: number) {
  if (!canvasContainer.value) {
    return { x: 0, y: 0 }
  }

  const rect = canvasContainer.value.getBoundingClientRect()

  return {
    x: Math.max(0, (canvasContainer.value.scrollLeft + clientX - rect.left) / scale.value),
    y: Math.max(0, (canvasContainer.value.scrollTop + clientY - rect.top) / scale.value),
  }
}

async function setScale(nextScale: number, focusClient?: { x: number; y: number }) {
  if (!canvasContainer.value) {
    scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
    return
  }

  const container = canvasContainer.value
  const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))

  if (Math.abs(clampedScale - scale.value) < 0.001) {
    return
  }

  const containerRect = container.getBoundingClientRect()
  const focusOffsetX = focusClient ? focusClient.x - containerRect.left : container.clientWidth / 2
  const focusOffsetY = focusClient ? focusClient.y - containerRect.top : container.clientHeight / 2
  const worldFocusX = (container.scrollLeft + focusOffsetX) / scale.value
  const worldFocusY = (container.scrollTop + focusOffsetY) / scale.value

  scale.value = clampedScale
  await nextTick()

  container.scrollLeft = worldFocusX * clampedScale - focusOffsetX
  container.scrollTop = worldFocusY * clampedScale - focusOffsetY
  updateViewportState()
}

async function zoomIn() {
  await setScale(scale.value + SCALE_STEP)
}

async function zoomOut() {
  await setScale(scale.value - SCALE_STEP)
}

async function resetZoom() {
  await setScale(1)
}

function centerViewportOnWorldPoint(worldX: number, worldY: number) {
  if (!canvasContainer.value) {
    return
  }

  canvasContainer.value.scrollLeft = Math.max(worldX * scale.value - canvasContainer.value.clientWidth / 2, 0)
  canvasContainer.value.scrollTop = Math.max(worldY * scale.value - canvasContainer.value.clientHeight / 2, 0)
  updateViewportState()
}

async function centerOnNode(nodeId: string) {
  const node = graphStore.getNodeById(nodeId)

  if (!node) {
    return
  }

  centerViewportOnWorldPoint(node.position_x + NODE_WIDTH / 2, node.position_y + NODE_HEIGHT / 2)
}

async function focusSelectedNode() {
  if (!selectedNode.value) {
    return
  }

  await centerOnNode(selectedNode.value.id)
}

async function focusStartNode() {
  if (!startNode.value) {
    return
  }

  await centerOnNode(startNode.value.id)
}

async function revealEdge(edgeId: string) {
  const edge = edges.value.find((entry) => entry.id === edgeId)

  if (!edge) {
    return
  }

  const sourceNode = graphStore.getNodeById(edge.source_node_id)
  const targetNode = graphStore.getNodeById(edge.target_node_id)

  if (!sourceNode || !targetNode) {
    return
  }

  centerViewportOnWorldPoint(
    (sourceNode.position_x + targetNode.position_x + NODE_WIDTH) / 2,
    (sourceNode.position_y + targetNode.position_y + NODE_HEIGHT) / 2
  )
}

async function fitView() {
  if (!canvasContainer.value) {
    return
  }

  const padding = 160
  const bounds = contentBounds.value
  const availableWidth = Math.max(canvasContainer.value.clientWidth - padding, 320)
  const availableHeight = Math.max(canvasContainer.value.clientHeight - padding, 240)
  const nextScale = Math.min(
    MAX_SCALE,
    Math.max(
      MIN_SCALE,
      Math.min(
        availableWidth / Math.max(bounds.width, NODE_WIDTH),
        availableHeight / Math.max(bounds.height, NODE_HEIGHT)
      )
    )
  )

  await setScale(nextScale)
  centerViewportOnWorldPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
}

async function duplicateSelectedNode() {
  if (!selectedNode.value) {
    return
  }

  const source = selectedNode.value
  const duplicatedNode = await graphStore.createNode({
    project_id: props.projectId,
    label: `${source.label} Copy`,
    node_type: source.node_type === 'start' ? 'clip' : source.node_type,
    media_clip_id: source.media_clip_id || null,
    start_time_ms: source.start_time_ms,
    end_time_ms: source.end_time_ms ?? null,
    auto_advance_ms: source.auto_advance_ms ?? null,
    is_ending: source.is_ending,
    position_x: source.position_x + 240,
    position_y: source.position_y + 80,
  })

  if (!duplicatedNode) {
    return
  }

  emit('node-select', duplicatedNode.id)
  await nextTick()
  await centerOnNode(duplicatedNode.id)
}

function activatePanMode(pointer?: { x: number; y: number }) {
  isPanMode.value = true
  panPointer.value = pointer ?? null
}

function deactivatePanMode() {
  isPanMode.value = false
  panPointer.value = null
}

async function togglePanMode() {
  if (isPanMode.value) {
    deactivatePanMode()
    return
  }

  if (activeNodeMove.value) {
    await releaseNodeMove()
  }

  activatePanMode()
}

async function releaseNodeMove() {
  const moveState = activeNodeMove.value

  if (!moveState) {
    return
  }

  activeNodeMove.value = null

  const updatedNode = graphStore.getNodeById(moveState.nodeId)

  if (updatedNode) {
    await graphStore.updateNode(moveState.nodeId, {
      position_x: updatedNode.position_x,
      position_y: updatedNode.position_y,
    })
  }
}

async function handleNodeClick(node: Node) {
  emit('node-select', node.id)

  if (activeNodeMove.value?.nodeId === node.id) {
    await releaseNodeMove()
    return
  }

  if (activeNodeMove.value && activeNodeMove.value.nodeId !== node.id) {
    await releaseNodeMove()
  }
}

async function handleNodeDoubleClick(event: MouseEvent, node: Node) {
  if (activeNodeMove.value?.nodeId === node.id) {
    return
  }

  if (activeNodeMove.value) {
    await releaseNodeMove()
  }

  deactivatePanMode()
  emit('node-select', node.id)

  const worldPoint = getWorldPointFromClient(event.clientX, event.clientY)

  activeNodeMove.value = {
    nodeId: node.id,
    pointerOffsetX: worldPoint.x - node.position_x,
    pointerOffsetY: worldPoint.y - node.position_y,
  }
}

async function handleSurfaceClick(event: MouseEvent) {
  if (connectionStart.value) {
    return
  }

  if (activeNodeMove.value) {
    await releaseNodeMove()
    return
  }

  clearSelection()

  if (isPanMode.value) {
    deactivatePanMode()
    return
  }

  activatePanMode({ x: event.clientX, y: event.clientY })
}

function handleMinimapClick(event: MouseEvent) {
  if (!canvasContainer.value) {
    return
  }

  const target = event.currentTarget as HTMLDivElement
  const rect = target.getBoundingClientRect()
  const percentX = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
  const percentY = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1)

  centerViewportOnWorldPoint(
    percentX * surfaceSize.value.width,
    percentY * surfaceSize.value.height
  )
}

function handleWindowMouseMove(event: MouseEvent) {
  if (connectionStart.value) {
    return
  }

  if (activeNodeMove.value) {
    const worldPoint = getWorldPointFromClient(event.clientX, event.clientY)

    graphStore.updateNodePosition(activeNodeMove.value.nodeId, {
      x: worldPoint.x - activeNodeMove.value.pointerOffsetX,
      y: worldPoint.y - activeNodeMove.value.pointerOffsetY,
    })

    return
  }

  if (!isPanMode.value || !canvasContainer.value) {
    return
  }

  if (!panPointer.value) {
    panPointer.value = { x: event.clientX, y: event.clientY }
    return
  }

  const deltaX = event.clientX - panPointer.value.x
  const deltaY = event.clientY - panPointer.value.y

  canvasContainer.value.scrollLeft -= deltaX
  canvasContainer.value.scrollTop -= deltaY
  panPointer.value = { x: event.clientX, y: event.clientY }
}

async function handleCanvasWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) {
    return
  }

  event.preventDefault()
  const nextScale = event.deltaY < 0 ? scale.value + SCALE_STEP : scale.value - SCALE_STEP
  await setScale(nextScale, { x: event.clientX, y: event.clientY })
}

async function handleCanvasKeydown(event: KeyboardEvent) {
  if (!canvasContainer.value) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()

    if (activeNodeMove.value) {
      await releaseNodeMove()
    }

    deactivatePanMode()
    return
  }

  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    await zoomIn()
    return
  }

  if (event.key === '-') {
    event.preventDefault()
    await zoomOut()
    return
  }

  if (event.key === '0') {
    event.preventDefault()
    await resetZoom()
    return
  }

  const nudgeAmount = event.shiftKey ? 240 : 120

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    canvasContainer.value.scrollLeft -= nudgeAmount
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    canvasContainer.value.scrollLeft += nudgeAmount
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    canvasContainer.value.scrollTop -= nudgeAmount
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    canvasContainer.value.scrollTop += nudgeAmount
  }
}

function startConnection(event: MouseEvent, node: Node, handle: 'left' | 'right') {
  event.preventDefault()

  if (activeNodeMove.value) {
    void releaseNodeMove()
  }

  deactivatePanMode()
  connectionStart.value = { nodeId: node.id, handle }

  const startPos = getHandlePosition(node, handle)

  function handleMouseMove(moveEvent: MouseEvent) {
    const worldPoint = getWorldPointFromClient(moveEvent.clientX, moveEvent.clientY)
    connectionPreview.value = `M ${startPos.x} ${startPos.y} L ${worldPoint.x} ${worldPoint.y}`
  }

  async function handleMouseUp(upEvent: MouseEvent) {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)

    const targetElement = document.elementFromPoint(upEvent.clientX, upEvent.clientY)
    const targetNodeElement = targetElement?.closest('[data-node-id]') as HTMLElement | null
    const targetNodeId = targetNodeElement?.dataset.nodeId

    if (targetNodeId && connectionStart.value && targetNodeId !== connectionStart.value.nodeId) {
      const sourceNodeId = connectionStart.value.handle === 'left'
        ? targetNodeId
        : connectionStart.value.nodeId
      const destinationNodeId = connectionStart.value.handle === 'left'
        ? connectionStart.value.nodeId
        : targetNodeId

      const edge = await graphStore.createEdge({
        project_id: props.projectId,
        source_node_id: sourceNodeId,
        target_node_id: destinationNodeId,
        choice_label: 'New Choice',
        trigger_at_ms: getDefaultChoiceTrigger(sourceNodeId),
        display_order: graphStore.getEdgesForNode(sourceNodeId).length,
      })

      if (edge) {
        emit('edge-select', edge.id)
      }
    }

    connectionStart.value = null
    connectionPreview.value = null
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function getHandlePosition(node: Node, handle: 'left' | 'right'): { x: number; y: number } {
  return handle === 'right'
    ? { x: node.position_x + NODE_WIDTH, y: node.position_y + NODE_HEIGHT / 2 }
    : { x: node.position_x, y: node.position_y + NODE_HEIGHT / 2 }
}

function getEdgePath(edge: Edge): string {
  const sourceNode = nodes.value.find((node) => node.id === edge.source_node_id)
  const targetNode = nodes.value.find((node) => node.id === edge.target_node_id)

  if (!sourceNode || !targetNode) {
    return ''
  }

  const start = getHandlePosition(sourceNode, 'right')
  const end = getHandlePosition(targetNode, 'left')
  const controlOffset = Math.min(Math.abs(end.x - start.x) / 2, 120)

  return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`
}

function getEdgeLabelPosition(edge: Edge): { x: number; y: number } {
  const sourceNode = nodes.value.find((node) => node.id === edge.source_node_id)
  const targetNode = nodes.value.find((node) => node.id === edge.target_node_id)

  if (!sourceNode || !targetNode) {
    return { x: 0, y: 0 }
  }

  return {
    x: (sourceNode.position_x + targetNode.position_x) / 2 + NODE_WIDTH / 2,
    y: (sourceNode.position_y + targetNode.position_y) / 2 + NODE_HEIGHT / 2,
  }
}

function getDefaultChoiceTrigger(nodeId: string): number {
  const sourceNode = graphStore.getNodeById(nodeId)

  if (!sourceNode) {
    return 0
  }

  const absoluteEndTime = sourceNode.end_time_ms ?? sourceNode.media_clip?.duration_ms

  if (!absoluteEndTime) {
    return 0
  }

  return Math.max(absoluteEndTime - sourceNode.start_time_ms, 0)
}

async function addNode() {
  const newNode = await graphStore.createNode({
    project_id: props.projectId,
    label: 'New Node',
    node_type: 'clip',
    position_x: 220 + Math.round(Math.random() * 180),
    position_y: 160 + Math.round(Math.random() * 220),
  })

  if (newNode) {
    emit('node-select', newNode.id)
    await nextTick()
    await centerOnNode(newNode.id)
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

defineExpose({
  revealNode: centerOnNode,
  revealEdge,
  fitView,
  focusStartNode,
})
</script>

<style scoped>
.node-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable both-edges;
  background: #0a1322;
}

.node-canvas:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(103, 232, 249, 0.72);
}

.node-canvas.pan-active {
  cursor: grab;
}

.node-canvas.node-move-active {
  cursor: crosshair;
}

.node-surface {
  position: relative;
  min-width: 100%;
  min-height: 100%;
  background:
    linear-gradient(rgba(15, 23, 42, 0.84), rgba(15, 23, 42, 0.84)),
    radial-gradient(circle at top, rgba(59, 130, 246, 0.14), transparent 24%);
}

.node-surface::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
  background-size: var(--grid-size, 32px) var(--grid-size, 32px);
  pointer-events: none;
}

.edges-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.nodes-layer {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
}

.edge-line,
.edge-label {
  pointer-events: auto;
}

.edge-line {
  fill: none;
  stroke: #6b7280;
  stroke-width: 2;
  cursor: pointer;
}

.edge-line:hover {
  stroke: #cbd5e1;
}

.edge-line.selected {
  stroke: #38bdf8;
  stroke-width: 3;
}

.edge-preview {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 2;
  stroke-dasharray: 8 6;
}

.edge-label {
  fill: #f8fafc;
  font-size: 12px;
  cursor: pointer;
  paint-order: stroke;
  stroke: rgba(15, 23, 42, 0.9);
  stroke-width: 5px;
  stroke-linejoin: round;
}

.node {
  position: absolute;
  width: 180px;
  background: #101827;
  border: 1px solid #32415d;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 18px 35px rgba(2, 6, 23, 0.36);
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.node:hover {
  transform: translateY(-2px);
  border-color: #5b708f;
}

.node.selected {
  border-color: #38bdf8;
}

.node.moving {
  border-color: #67e8f9;
  box-shadow: 0 22px 48px rgba(56, 189, 248, 0.22);
  cursor: grabbing;
}

.node.start-node {
  border-color: #22c55e;
}

.node.end-node {
  border-color: #f97316;
}

.node-thumbnail {
  position: relative;
  width: 100%;
  height: 84px;
  background: #0f172a;
  border-radius: 15px 15px 0 0;
  overflow: hidden;
}

.node-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
}

.duration-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 3px 7px;
  background: rgba(2, 6, 23, 0.74);
  border-radius: 999px;
  font-size: 11px;
  color: #f8fafc;
}

.node-info {
  display: grid;
  gap: 6px;
  padding: 10px 12px 14px;
}

.node-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
}

.node-type {
  font-size: 11px;
  color: #8ea3bf;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.node-mode-badge {
  justify-self: start;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(103, 232, 249, 0.14);
  color: #cffafe;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.handle {
  position: absolute;
  width: 14px;
  height: 14px;
  background: #1d4ed8;
  border: 2px solid #0f172a;
  border-radius: 999px;
  cursor: crosshair;
}

.handle:hover {
  background: #38bdf8;
}

.handle-right {
  right: -7px;
  top: 50%;
  transform: translateY(-50%);
}

.handle-left {
  left: -7px;
  top: 50%;
  transform: translateY(-50%);
}

.toolbar {
  position: absolute;
  left: 14px;
  bottom: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: fit-content;
  max-width: calc(100% - 210px);
  padding: 12px;
  z-index: 4;
}

.toolbar-button,
.toolbar-icon,
.toolbar-readout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 7px 10px;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid #32415d;
  border-radius: 999px;
  color: #f8fafc;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(2, 6, 23, 0.24);
  backdrop-filter: blur(12px);
}

.toolbar-button:hover,
.toolbar-icon:hover,
.toolbar-readout:hover {
  background: #162033;
}

.toolbar-toggle.active {
  border-color: rgba(103, 232, 249, 0.48);
  background: rgba(8, 47, 73, 0.94);
}

.toolbar-group {
  display: inline-flex;
  gap: 6px;
}

.toolbar-icon {
  min-width: 34px;
  padding: 7px 0;
  font-size: 1rem;
  font-weight: 700;
}

.toolbar-readout {
  min-width: 60px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.minimap-shell {
  position: absolute;
  right: 14px;
  bottom: 14px;
  padding: 8px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.16);
  z-index: 4;
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 24px rgba(2, 6, 23, 0.24);
}

.minimap {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background:
    linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.8)),
    radial-gradient(circle at top, rgba(59, 130, 246, 0.12), transparent 24%);
  cursor: pointer;
}

.minimap-surface {
  position: relative;
  width: 100%;
  height: 100%;
}

.minimap-surface::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
}

.minimap-node {
  position: absolute;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.55);
  border: 1px solid rgba(191, 219, 254, 0.55);
}

.minimap-node.start {
  background: rgba(34, 197, 94, 0.55);
}

.minimap-node.ending {
  background: rgba(249, 115, 22, 0.55);
}

.minimap-node.selected {
  background: rgba(236, 72, 153, 0.72);
  border-color: rgba(251, 207, 232, 0.92);
}

.minimap-viewport {
  position: absolute;
  border: 2px solid rgba(226, 232, 240, 0.9);
  border-radius: 12px;
  background: rgba(226, 232, 240, 0.08);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.28);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 900px) {
  .toolbar {
    left: 12px;
    bottom: 12px;
    max-width: calc(100% - 160px);
    padding: 10px;
  }

  .minimap-shell {
    right: 12px;
    bottom: 12px;
    padding: 7px;
  }
}
</style>

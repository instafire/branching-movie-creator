import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { edgesApi, nodesApi, projectsApi } from '../api/client';

export interface MediaClip {
  id: string;
  project_id: string;
  user_id?: string;
  original_filename: string;
  original_media_type?: string;
  thumbnail_url?: string;
  converted_storage_key?: string;
  duration_ms?: number;
  width?: number;
  height?: number;
  processing_status: string;
  processing_progress?: number;
  processing_error?: string;
  stream_url?: string;
}

export interface Node {
  id: string;
  project_id: string;
  media_clip_id?: string | null;
  label: string;
  node_type: 'clip' | 'start' | 'end' | 'checkpoint';
  start_time_ms: number;
  end_time_ms?: number | null;
  position_x: number;
  position_y: number;
  auto_advance_ms?: number | null;
  is_ending: boolean;
  media_clip?: MediaClip | null;
}

export interface Edge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  choice_label: string;
  choice_description?: string | null;
  trigger_at_ms: number;
  hide_at_ms?: number | null;
  source_handle?: 'left' | 'right' | 'top' | 'bottom';
  target_handle?: 'left' | 'right' | 'top' | 'bottom';
  display_order: number;
  target_node?: Node;
}

interface GraphResponse {
  id: string;
  title: string;
  description?: string;
  is_published?: boolean;
  nodes: Node[];
  edges: Edge[];
  media_clips: MediaClip[];
}

export const useGraphStore = defineStore('graph', () => {
  const nodes = ref<Node[]>([]);
  const edges = ref<Edge[]>([]);
  const mediaClips = ref<MediaClip[]>([]);
  const selectedNodeId = ref<string | null>(null);
  const selectedEdgeId = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const selectedNode = computed(() =>
    nodes.value.find((node) => node.id === selectedNodeId.value)
  );

  const selectedEdge = computed(() =>
    edges.value.find((edge) => edge.id === selectedEdgeId.value)
  );

  function getNodeById(id: string): Node | undefined {
    return nodes.value.find((node) => node.id === id);
  }

  function getEdgesForNode(nodeId: string): Edge[] {
    return edges.value
      .filter((edge) => edge.source_node_id === nodeId)
      .sort((left, right) => left.display_order - right.display_order);
  }

  async function loadGraph(
    projectId: string,
    options: { publicView?: boolean } = {}
  ): Promise<GraphResponse | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = options.publicView
        ? await projectsApi.getPublic(projectId)
        : await projectsApi.get(projectId);

      const data = response.data as GraphResponse;

      nodes.value = data.nodes || [];
      edges.value = data.edges || [];
      mediaClips.value = data.media_clips || [];
      selectedNodeId.value = null;
      selectedEdgeId.value = null;

      return data;
    } catch (err: any) {
      nodes.value = [];
      edges.value = [];
      mediaClips.value = [];
      error.value = err.response?.data?.error || 'Failed to load project graph';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function createNode(data: Partial<Node>) {
    try {
      const response = await nodesApi.create(data);
      const newNode = response.data as Node;
      nodes.value.push(newNode);
      return newNode;
    } catch (err) {
      console.error('Failed to create node:', err);
      return null;
    }
  }

  async function updateNode(id: string, data: Partial<Node>) {
    try {
      const response = await nodesApi.update(id, data);
      const index = nodes.value.findIndex((node) => node.id === id);

      if (index !== -1) {
        nodes.value[index] = {
          ...nodes.value[index],
          ...response.data,
        };
      }

      return response.data as Node;
    } catch (err) {
      console.error('Failed to update node:', err);
      return null;
    }
  }

  function updateNodePosition(id: string, position: { x: number; y: number }) {
    const node = nodes.value.find((entry) => entry.id === id);

    if (node) {
      node.position_x = Math.round(position.x);
      node.position_y = Math.round(position.y);
    }
  }

  async function deleteNode(id: string) {
    try {
      await nodesApi.delete(id);
      nodes.value = nodes.value.filter((node) => node.id !== id);
      edges.value = edges.value.filter(
        (edge) => edge.source_node_id !== id && edge.target_node_id !== id
      );

      if (selectedNodeId.value === id) {
        selectedNodeId.value = null;
      }

      return true;
    } catch (err) {
      console.error('Failed to delete node:', err);
      return false;
    }
  }

  async function createEdge(data: Partial<Edge>) {
    try {
      const response = await edgesApi.create(data);
      const newEdge = response.data as Edge;
      edges.value.push(newEdge);
      return newEdge;
    } catch (err) {
      console.error('Failed to create edge:', err);
      return null;
    }
  }

  async function updateEdge(id: string, data: Partial<Edge>) {
    try {
      const response = await edgesApi.update(id, data);
      const index = edges.value.findIndex((edge) => edge.id === id);

      if (index !== -1) {
        edges.value[index] = {
          ...edges.value[index],
          ...response.data,
        };
      }

      return response.data as Edge;
    } catch (err) {
      console.error('Failed to update edge:', err);
      return null;
    }
  }

  async function deleteEdge(id: string) {
    try {
      await edgesApi.delete(id);
      edges.value = edges.value.filter((edge) => edge.id !== id);

      if (selectedEdgeId.value === id) {
        selectedEdgeId.value = null;
      }

      return true;
    } catch (err) {
      console.error('Failed to delete edge:', err);
      return false;
    }
  }

  function selectNode(id: string | null) {
    selectedNodeId.value = id;
    selectedEdgeId.value = null;
  }

  function selectEdge(id: string | null) {
    selectedEdgeId.value = id;
    selectedNodeId.value = null;
  }

  function clearSelection() {
    selectedNodeId.value = null;
    selectedEdgeId.value = null;
  }

  return {
    nodes,
    edges,
    mediaClips,
    selectedNodeId,
    selectedEdgeId,
    isLoading,
    error,
    selectedNode,
    selectedEdge,
    getNodeById,
    getEdgesForNode,
    loadGraph,
    createNode,
    updateNode,
    updateNodePosition,
    deleteNode,
    createEdge,
    updateEdge,
    deleteEdge,
    selectNode,
    selectEdge,
    clearSelection,
  };
});

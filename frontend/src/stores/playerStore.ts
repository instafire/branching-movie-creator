import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { Edge, Node } from './graphStore';

interface HistoryEntry {
  nodeId: string;
  timeMs: number;
  remainingChoices: Edge[];
}

export const usePlayerStore = defineStore('player', () => {
  const currentNode = ref<Node | null>(null);
  const mediaTimeMs = ref(0);
  const currentTimeMs = ref(0);
  const durationMs = ref(0);
  const isPlaying = ref(false);
  const isPaused = ref(false);
  const isEnded = ref(false);
  const isBuffering = ref(false);
  const availableChoices = ref<Edge[]>([]);
  const gameState = ref<Record<string, boolean>>({});
  const historyStack = ref<HistoryEntry[]>([]);

  const currentTimeSeconds = computed(() => currentTimeMs.value / 1000);

  const visibleChoices = computed(() => {
    if (!currentNode.value) {
      return [];
    }

    return availableChoices.value.filter((edge) => {
      const triggerAt = edge.trigger_at_ms ?? 0;
      if (triggerAt <= 0 || isEnded.value) {
        return false;
      }

      const hideAt = edge.hide_at_ms ?? Number.POSITIVE_INFINITY;
      return currentTimeMs.value >= triggerAt && currentTimeMs.value < hideAt;
    });
  });

  const hasActiveChoices = computed(() => visibleChoices.value.length > 0);

  const promptChoices = computed(() =>
    isEnded.value ? availableChoices.value : visibleChoices.value
  );

  const canShowChoices = computed(() => promptChoices.value.length > 0);

  function isChoiceLocked(edge: Edge): boolean {
    if (!edge.require_variable) return false;
    return !gameState.value[edge.require_variable];
  }

  function setCurrentNode(node: Node | null) {
    currentNode.value = node;
    mediaTimeMs.value = node?.start_time_ms ?? 0;
    currentTimeMs.value = 0;
    isEnded.value = false;
    isPlaying.value = false;
    isPaused.value = false;

    if (!node) {
      durationMs.value = 0;
      return;
    }

    const clipDuration = node.media_clip?.duration_ms ?? 0;
    const absoluteEndTime = node.end_time_ms ?? clipDuration;
    durationMs.value = Math.max(absoluteEndTime - node.start_time_ms, 0);
  }

  function setAvailableChoices(edges: Edge[]) {
    availableChoices.value = [...edges].sort(
      (left, right) => left.display_order - right.display_order
    );
  }

  function setDuration(nextDurationMs: number) {
    durationMs.value = Math.max(nextDurationMs, 0);
  }

  function updateTime(nextMediaTimeMs: number) {
    mediaTimeMs.value = nextMediaTimeMs;

    if (!currentNode.value) {
      currentTimeMs.value = nextMediaTimeMs;
      return;
    }

    currentTimeMs.value = Math.max(nextMediaTimeMs - currentNode.value.start_time_ms, 0);
  }

  function setPlaying(playing: boolean) {
    isPlaying.value = playing;
    isPaused.value = !playing;
  }

  function setEnded() {
    isEnded.value = true;
    isPlaying.value = false;
    isPaused.value = true;
  }

  function setBuffering(buffering: boolean) {
    isBuffering.value = buffering;
  }

  function selectChoice(edge: Edge): string | null {
    if (isChoiceLocked(edge)) return null;
    if (edge.set_variable) {
      gameState.value[edge.set_variable] = true;
    }
    return edge.target_node_id;
  }

  function pushReturnPoint(nodeId: string, timeMs: number, remainingChoices: Edge[]) {
    historyStack.value.push({ nodeId, timeMs, remainingChoices });
  }

  function popReturnPoint(): HistoryEntry | null {
    return historyStack.value.pop() ?? null;
  }

  function hasReturnPoint(): boolean {
    return historyStack.value.length > 0;
  }

  function reset() {
    currentNode.value = null;
    mediaTimeMs.value = 0;
    currentTimeMs.value = 0;
    durationMs.value = 0;
    isPlaying.value = false;
    isPaused.value = false;
    isEnded.value = false;
    isBuffering.value = false;
    availableChoices.value = [];
    gameState.value = {};
    historyStack.value = [];
  }

  return {
    currentNode,
    mediaTimeMs,
    currentTimeMs,
    durationMs,
    isPlaying,
    isPaused,
    isEnded,
    isBuffering,
    availableChoices,
    gameState,
    historyStack,
    currentTimeSeconds,
    visibleChoices,
    promptChoices,
    hasActiveChoices,
    canShowChoices,
    isChoiceLocked,
    setCurrentNode,
    setDuration,
    setAvailableChoices,
    updateTime,
    setPlaying,
    setEnded,
    setBuffering,
    selectChoice,
    pushReturnPoint,
    popReturnPoint,
    hasReturnPoint,
    reset,
  };
});

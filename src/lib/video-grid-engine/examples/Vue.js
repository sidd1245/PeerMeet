/**
 * Vue.js (Vue 3, Composition API)
 *
 * Mirrors the React example's structure: a composable
 * (useVideoGridLayout) that owns the engine + ResizeObserver, and a
 * <VideoGrid> SFC that renders the resulting layout via v-for + inline
 * CSS custom properties, using the same .vge-container/.vge-tile
 * classes from video-grid-engine.css so styling is shared across
 * framework integrations.
 *
 * Two files are shown below: the composable (plain .js) and the
 * component (.vue SFC), separated by a comment marker since this is a
 * single example file.
 */

// ============================================================
// useVideoGridLayout.js
// ============================================================
import { ref, shallowRef, watch, onMounted, onBeforeUnmount } from 'vue';
import VideoGridEngine from '../src/VideoGridEngine.js';

/**
 * @param {Object} options
 * @param {import('vue').Ref<import('../src/index.d.ts').Participant[]>} options.participants
 * @param {import('vue').Ref<import('../src/index.d.ts').LayoutMode>} [options.mode]
 * @param {import('vue').Ref<string|null>} [options.pinnedParticipantId]
 * @param {number} [options.aspectRatio=16/9]
 * @param {number} [options.gap=8]
 */
export function useVideoGridLayout({ participants, mode, pinnedParticipantId, aspectRatio = 16 / 9, gap = 8 }) {
  const containerRef = ref(null);
  const layout = shallowRef(null);

  // The engine instance is created once and persists for the lifetime
  // of the component, same rationale as the React hook: re-creating it
  // on every reactive update would throw away its internal cache.
  const engine = new VideoGridEngine({ aspectRatio, gap, mode: mode?.value ?? 'grid' });

  let resizeObserver = null;

  function recalculate() {
    const el = containerRef.value;
    if (!el) return;
    layout.value = engine.calculateLayout({
      participants: participants.value,
      containerWidth: el.clientWidth,
      containerHeight: el.clientHeight,
    });
  }

  if (mode) {
    watch(mode, (newMode) => {
      engine.setLayoutMode(newMode);
      recalculate();
    });
  }

  if (pinnedParticipantId) {
    watch(pinnedParticipantId, (id) => {
      engine.setPinnedParticipant(id);
      recalculate();
    });
  }

  watch(participants, recalculate, { deep: false });

  onMounted(() => {
    recalculate();
    resizeObserver = new ResizeObserver(() => {
      const el = containerRef.value;
      if (!el) return;
      engine
        .resize({
          participants: participants.value,
          containerWidth: el.clientWidth,
          containerHeight: el.clientHeight,
        })
        .then((result) => {
          layout.value = result;
        });
    });
    resizeObserver.observe(containerRef.value);
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
  });

  return { containerRef, layout, engine };
}

// ============================================================
// VideoGrid.vue
// ============================================================
/*
<template>
  <div
    ref="containerRef"
    class="vge-container"
    :class="{ 'vge-container--scrollable': layout?.isOverflowing }"
  >
    <div
      v-for="pos in layout?.positions ?? []"
      :key="pos.participantId"
      class="vge-tile"
      :class="{ 'vge-tile--main': pos.participantId === layout.mainParticipantId }"
      :style="{
        '--vge-x': pos.x + 'px',
        '--vge-y': pos.y + 'px',
        '--vge-w': pos.width + 'px',
        '--vge-h': pos.height + 'px',
      }"
    >
      <slot :participant="participantsById.get(pos.participantId)" :position="pos" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useVideoGridLayout } from './useVideoGridLayout.js';

const props = defineProps({
  participants: { type: Array, required: true },
  mode: { type: String, default: 'grid' },
  pinnedParticipantId: { type: String, default: null },
});

// Wrap props in refs the composable can watch reactively.
const participantsRef = computed(() => props.participants);
const modeRef = computed(() => props.mode);
const pinnedRef = computed(() => props.pinnedParticipantId);

const { containerRef, layout } = useVideoGridLayout({
  participants: participantsRef,
  mode: modeRef,
  pinnedParticipantId: pinnedRef,
});

const participantsById = computed(() => {
  const map = new Map();
  for (const p of props.participants) map.set(p.id, p);
  return map;
});
</script>
*/

// ============================================================
// Example usage in a parent component
// ============================================================
/*
<template>
  <ModeSwitcher v-model="mode" />
  <VideoGrid :participants="roomParticipants" :mode="mode" :pinned-participant-id="pinnedId">
    <template #default="{ participant, position }">
      <video :ref="(el) => attachStream(el, participant.id)" autoplay playsinline :muted="participant.id === 'local'" />
      <div class="vge-tile-label">{{ participant.displayName }}</div>
    </template>
  </VideoGrid>
</template>

<script setup>
import { ref } from 'vue';
import VideoGrid from './VideoGrid.vue';

const mode = ref('grid');
const pinnedId = ref(null);
const roomParticipants = ref([...]); // from your call SDK's reactive state
</script>
*/

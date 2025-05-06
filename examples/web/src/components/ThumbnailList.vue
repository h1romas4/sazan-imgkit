<script setup>
import { ref } from 'vue';

/**
 * Props for ThumbnailList component.
 * @property {Array<{name: string, url: string, canvas?: OffscreenCanvas}>} images - List of image objects to display as thumbnails.
 * @property {number} activeIndex - Index of the currently active (selected) image.
 */
const props = defineProps({
  images: {
    type: Array,
    required: true,
  },
  activeIndex: {
    type: Number,
    required: true,
  },
});

/**
 * Emits events to parent component.
 * @event select - Fires when a thumbnail is selected. Payload: index (number)
 * @event remove - Fires when a thumbnail is removed. Payload: index (number)
 * @event reorder - Fires when thumbnails are reordered. Payload: new array (Array)
 */
const emit = defineEmits(['select', 'remove', 'reorder']);

/**
 * Index of the thumbnail currently being dragged (for drag-and-drop reordering).
 * @type {import('vue').Ref<number|null>}
 */
let dragSrcIdx = ref(null);

/**
 * Handles drag start for a thumbnail.
 * @param {number} idx
 * @param {DragEvent} event
 */
const onThumbDragStart = (idx, event) => {
  dragSrcIdx.value = idx;
  const thumb = event.target.closest('.clipgrid-thumb');
  if (thumb) {
    thumb.classList.add('dragging');
    const img = thumb.querySelector('img');
    if (img) {
      event.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
    }
  }
};

/**
 * Handles drag over for a thumbnail.
 * @param {number} idx
 */
const onThumbDragOver = (idx) => {
  const thumbs = document.querySelectorAll('.clipgrid-thumb');
  thumbs.forEach((thumb, i) => {
    if (i === idx) {
      thumb.classList.add('drag-over');
    } else {
      thumb.classList.remove('drag-over');
    }
  });
};

/**
 * Handles drop for a thumbnail (reordering).
 * @param {number} idx
 */
const onThumbDrop = (idx) => {
  const thumbs = document.querySelectorAll('.clipgrid-thumb');
  thumbs.forEach(thumb => {
    thumb.classList.remove('dragging', 'drag-over');
  });
  if (dragSrcIdx.value === null || dragSrcIdx.value === idx) return;
  const arr = props.images.slice();
  const moved = arr.splice(dragSrcIdx.value, 1)[0];
  arr.splice(idx, 0, moved);
  emit('reorder', arr);
  dragSrcIdx.value = null;
};

/**
 * Handles click on a thumbnail (select).
 * @param {number} idx
 */
const onThumbClick = (idx) => {
  emit('select', idx);
};

/**
 * Handles click on remove button.
 * @param {number} idx
 */
const onThumbRemove = (idx) => {
  emit('remove', idx);
};
</script>

<template>
  <div class="clipgrid-thumbnails">
    <div
      v-for="(img, idx) in images"
      :key="img.url"
      class="clipgrid-thumb"
      :class="{ active: idx === activeIndex }"
      draggable="true"
      @dragstart="onThumbDragStart(idx, $event)"
      @dragover.prevent="onThumbDragOver(idx)"
      @drop.prevent="onThumbDrop(idx)"
    >
      <span class="clipgrid-thumbclose" @click.stop="onThumbRemove(idx)">×</span>
      <img :src="img.url" :alt="img.name" @click="onThumbClick(idx)" />
      <div class="clipgrid-thumbname">{{ img.name }}</div>
    </div>
  </div>
</template>

<style scoped>
.clipgrid-thumbnails {
  display: flex;
  flex-direction: row;
  gap: 12px;
  margin: 18px 0 0 0;
  flex-wrap: wrap;
  justify-content: center;
}
.clipgrid-thumb {
  border: 2px solid #444;
  border-radius: 6px;
  width: 64px;
  height: 64px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #181818;
  transition: border-color 0.2s;
  position: relative;
}
.clipgrid-thumb.active {
  border-color: #42b883;
}
.clipgrid-thumb img {
  width: 100%;
  height: 48px;
  object-fit: cover;
  display: block;
}
.clipgrid-thumbname {
  font-size: 11px;
  color: #bbb;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.clipgrid-thumbclose {
  position: absolute;
  top: 2px;
  right: 4px;
  color: #bbb;
  background: #232323;
  border-radius: 50%;
  font-size: 16px;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
  z-index: 2;
  transition: background 0.2s, color 0.2s;
}
.clipgrid-thumbclose:hover {
  background: #e55;
  color: #fff;
}
.clipgrid-thumb {
  cursor: grab;
}
.clipgrid-thumb.dragging {
  cursor: grabbing;
  opacity: 0.5;
  transform: scale(1.1);
}
.clipgrid-thumb.drag-over {
  border-color: #42b883;
  background: rgba(66, 184, 131, 0.2);
  transition: background 0.2s ease, border-color 0.2s ease;
}
</style>

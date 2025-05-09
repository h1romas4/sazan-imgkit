<script setup>
import { ref } from 'vue';

/**
 * Props for ThumbnailList component.
 * @property {Array<{name: string, url: string, canvas?: OffscreenCanvas}>} images - List of image objects to display as thumbnails.
 * @property {number} activeIndex - Index of the currently active (selected) image.
 * @property {number} thumbWidth - Width of each thumbnail in px. Default: 64
 * @property {number} thumbHeight - Height of each thumbnail in px. Default: 64
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
  thumbWidth: {
    type: Number,
    default: 64,
  },
  thumbHeight: {
    type: Number,
    default: 64,
  },
  disabled: {
    type: Boolean,
    default: false,
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
const dragSrcIdx = ref(null);

/**
 * Index of the thumbnail currently being dragged over.
 * @type {import('vue').Ref<number|null>}
 */
const dragOverIdx = ref(null);

/**
 * Handles drag start for a thumbnail.
 * @param {number} idx
 * @param {DragEvent} event
 */
const onThumbDragStart = (idx, event) => {
  dragSrcIdx.value = idx;
  dragOverIdx.value = null;
  const thumb = event.target.closest('.cropgrid-thumb');
  if (thumb) {
    const img = thumb.querySelector('img');
    if (img) {
      // Create a small offscreen canvas to use as drag image (use thumbWidth/Height)
      const canvas = document.createElement('canvas');
      const sizeW = props.thumbWidth;
      const sizeH = props.thumbHeight;
      canvas.width = sizeW;
      canvas.height = sizeH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, sizeW, sizeH);
      // Show drag image at bottom-right (right-bottom corner of the canvas)
      event.dataTransfer.setDragImage(canvas, sizeW, sizeH);
    }
  }
};

/**
 * Handles drag over for a thumbnail.
 * @param {number} idx
 */
const onThumbDragOver = (idx) => {
  dragOverIdx.value = idx;
};

/**
 * Handles drop for a thumbnail (reordering).
 * @param {number} idx
 */
const onThumbDrop = (idx) => {
  if (dragSrcIdx.value === null || dragSrcIdx.value === idx) {
    dragSrcIdx.value = null;
    dragOverIdx.value = null;
    return;
  }
  const arr = props.images.slice();
  const moved = arr.splice(dragSrcIdx.value, 1)[0];
  arr.splice(idx, 0, moved);
  emit('reorder', arr);
  dragSrcIdx.value = null;
  dragOverIdx.value = null;
};

/**
 * Handles click on a thumbnail (select).
 * @param {number} idx
 */
const onThumbClick = (idx) => {
  if (props.disabled) return;
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
  <div class="cropgrid-thumbnails">
    <div
      v-for="(img, idx) in images"
      :key="img.url"
      class="cropgrid-thumb"
      :class="{ active: idx === activeIndex, dragging: idx === dragSrcIdx, 'drag-over': idx === dragOverIdx }"
      :style="{ width: props.thumbWidth + 'px', height: props.thumbHeight + 'px' }"
      :draggable="images.length > 1"
      @dragstart="images.length > 1 && onThumbDragStart(idx, $event)"
      @dragover.prevent="images.length > 1 && onThumbDragOver(idx)"
      @drop.prevent="images.length > 1 && onThumbDrop(idx)"
    >
      <slot
        name="thumb-remove"
        :img="img"
        :idx="idx"
        :remove="onThumbRemove"
        :active="idx === activeIndex"
        :dragging="idx === dragSrcIdx"
        :dragOver="idx === dragOverIdx"
      >
        <span class="cropgrid-thumbclose" @click.stop="onThumbRemove(idx)">×</span>
      </slot>
      <img
        :src="img.url"
        :alt="img.name"
        @click="onThumbClick(idx)"
        :style="{ height: (props.thumbHeight - 16) + 'px', opacity: props.disabled ? 0.5 : 1, pointerEvents: props.disabled ? 'none' : 'auto' }"
      />
      <slot
        name="thumb-name"
        :img="img"
        :idx="idx"
        :active="idx === activeIndex"
        :dragging="idx === dragSrcIdx"
        :dragOver="idx === dragOverIdx"
      >
        <div class="cropgrid-thumbname">{{ img.name }}</div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.cropgrid-thumbnails {
  display: flex;
  flex-direction: row;
  gap: 12px;
  margin: 18px 0 0 0;
  flex-wrap: wrap;
  justify-content: center;
}
.cropgrid-thumb {
  border: 2px solid #444;
  border-radius: 6px;
  /* width/height are now set via style binding */
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #181818;
  transition: border-color 0.2s;
  position: relative;
}
.cropgrid-thumb.active {
  border-color: #42b883;
}
.cropgrid-thumb img {
  width: 100%;
  height: 48px;
  object-fit: cover;
  display: block;
}
.cropgrid-thumbname {
  font-size: 11px;
  color: #bbb;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cropgrid-thumbclose {
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
.cropgrid-thumbclose:hover {
  background: #e55;
  color: #fff;
}
.cropgrid-thumb {
  cursor: grab;
}
.cropgrid-thumb.dragging {
  cursor: grabbing;
  opacity: 0.5;
  transform: scale(1.1);
}
.cropgrid-thumb.drag-over {
  border-color: #42b883;
  background: rgba(66, 184, 131, 0.2);
  transition: background 0.2s ease, border-color 0.2s ease;
}
.cropgrid-thumb {
  cursor: pointer;
}
.cropgrid-thumb[draggable="true"] {
  cursor: grab;
}
.cropgrid-thumb[draggable="false"] {
  cursor: default;
}
</style>

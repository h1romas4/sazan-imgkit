<script setup>
import { ref } from 'vue';

/**
 * ImageDropArea: Component for accepting image files via drag and drop.
 * @emits drop (files: FileList) - Emitted when files are dropped.
 */
const emit = defineEmits(['drop']);

/**
 * True if a file is being dragged over the drop area.
 * @type {import('vue').Ref<boolean>}
 */
const isDragging = ref(false);

/**
 * Handler for dragover event.
 * @param {DragEvent} e
 */
const onDragOver = (e) => {
  e.preventDefault();
  isDragging.value = true;
};

/**
 * Handler for dragleave event.
 * @param {DragEvent} e
 */
const onDragLeave = (e) => {
  e.preventDefault();
  isDragging.value = false;
};

/**
 * Handler for drop event.
 * @param {DragEvent} e
 */
const onDrop = (e) => {
  e.preventDefault();
  isDragging.value = false;
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    emit('drop', e.dataTransfer.files);
  }
};
</script>
<template>
  <div
    class="clipgrid-droparea"
    :class="{ dragging: isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="clipgrid-dropicon">📂</div>
    <div class="clipgrid-dropmsg">Drag and drop image file(s) here</div>
    <div style="height: 12px;"></div>
    <div class="clipgrid-dropmsg">All image files are processed offline</div>
    <div class="clipgrid-dropmsg">(never uploaded to the Internet)</div>
  </div>
</template>

<style scoped>
.clipgrid-droparea {
  width: 480px;
  height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #888;
  border-radius: 12px;
  background: #222;
  color: #bbb;
  margin: auto;
  font-size: 18px;
  transition: border-color 0.2s;
}
.clipgrid-droparea.dragging {
  border-color: #42b883;
  background: #222c;
}
.clipgrid-dropicon {
  font-size: 48px;
  margin-bottom: 16px;
}
.clipgrid-dropmsg {
  font-size: 18px;
  color: #bbb;
}
</style>

<script setup>
import { watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { useCropperState } from '../composables/useCropperState'

const state = useCropperState()

watch(() => state.aspectRatioMode, (newMode, oldMode) => {
  if (oldMode === 'free' && newMode === 'square') {
    const minSide = Math.min(state.imageWidth, state.imageHeight);
    let newValue = Math.min(state.coordinates.width, state.coordinates.height, minSide);
    state.coordinates = { ...state.coordinates, width: newValue, height: newValue };
    nextTick(() => state.applyCoordinatesToCropper());
  }
});

onMounted(() => {
  window.addEventListener('resize', refreshCropper);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', refreshCropper);
});

const left = computed({
  get: () => state.coordinates.left,
  set: v => { state.coordinates = { ...state.coordinates, left: v } }
})

const top = computed({
  get: () => state.coordinates.top,
  set: v => { state.coordinates = { ...state.coordinates, top: v } }
})

const widthMax = computed(() => state.imageWidth);
const heightMax = computed(() => state.imageHeight);

const width = computed({
  get: () => state.coordinates.width,
  set: v => {
    if (state.aspectRatioMode === 'square') {
      state.coordinates = { ...state.coordinates, width: v, height: v };
      nextTick(() => state.applyCoordinatesToCropper());
    } else {
      state.coordinates = { ...state.coordinates, width: v };
    }
  }
})

const height = computed({
  get: () => state.coordinates.height,
  set: v => {
    if (state.aspectRatioMode === 'square') {
      state.coordinates = { ...state.coordinates, width: v, height: v };
      nextTick(() => state.applyCoordinatesToCropper());
    } else {
      state.coordinates = { ...state.coordinates, height: v };
    }
  }
})

const refreshCropper = () => {
  if (state.cropperRef && typeof state.cropperRef.refresh === 'function') {
    state.cropperRef.refresh();
  }
}

const onCropperChange = (e) => {
  state.onCropperChange(e)
}

const onCropperReady = () => {
  if (state.cropperRef && typeof state.cropperRef.setCoordinates === 'function') {
    // hack
    if (state.coordinates.width == 1) {
      state.coordinates.width = 500;
    }
    state.cropperRef.setCoordinates({
      ...state.coordinates,
    });
  }
}

const applyCoordinatesToCropper = () => {
  state.applyCoordinatesToCropper()
}

const isDirty = computed(() => {
  const a = state.coordinates, b = state.cropperCurrent
  return a.left !== b.left || a.top !== b.top || a.width !== b.width || a.height !== b.height
})

const onImageDrop = (e) => {
  state.onImageDrop(e)
}

let dragSrcIdx = null;

const onThumbDragStart = (idx, event) => {
  dragSrcIdx = idx;
  const thumb = document.querySelectorAll('.clipgrid-thumb')[idx];
  if (thumb) {
    thumb.classList.add('dragging');
    const img = thumb.querySelector('img');
    if (img) {
      event.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
    }
  }
}

const onThumbDragOver = (idx) => {
  const thumbs = document.querySelectorAll('.clipgrid-thumb');
  thumbs.forEach((thumb, i) => {
    if (i === idx) {
      thumb.classList.add('drag-over');
    } else {
      thumb.classList.remove('drag-over');
    }
  });
}

const onThumbDrop = (idx) => {
  const thumbs = document.querySelectorAll('.clipgrid-thumb');
  thumbs.forEach(thumb => {
    thumb.classList.remove('dragging', 'drag-over');
  });

  if (dragSrcIdx === null || dragSrcIdx === idx) return;
  const arr = state.images;
  const moved = arr.splice(dragSrcIdx, 1)[0];
  arr.splice(idx, 0, moved);

  if (state.activeImageIndex === dragSrcIdx) {
    state.activeImageIndex = idx;
  } else if (state.activeImageIndex > dragSrcIdx && state.activeImageIndex <= idx) {
    state.activeImageIndex--;
  } else if (state.activeImageIndex < dragSrcIdx && state.activeImageIndex >= idx) {
    state.activeImageIndex++;
  }

  dragSrcIdx = null;
}

const onGenerateImage = () => {
  state.isGenerating = true;
  setTimeout(() => {
    state.generateImage();
  }, 200);
}
</script>
<template>
  <div class="clipgrid-root" @dragover.prevent @drop.prevent="onImageDrop">
    <div class="clipgrid-main">
      <template v-if="state.image">
        <div class="clipgrid-cropper-wrap">
          <Cropper
            :ref="el => state.cropperRef = el"
            :src="state.image"
            :stencil-props="{ aspectRatio: state.aspectRatioValue }"
            :min-width="1"
            :min-height="1"
            :max-width="state.imageWidth"
            :max-height="state.imageHeight"
            :default-size="{ width: state.coordinates.width, height: state.coordinates.height }"
            :default-position="{ left: state.coordinates.left, top: state.coordinates.top }"
            :transitions="true"
            :resize-image="false"
            :resize-stencil="false"
            class="clipgrid-cropper"
            @change="onCropperChange"
            @ready="onCropperReady"
          />
        </div>
        <div class="image-info">
          <span>{{ state.imageWidth }} x {{ state.imageHeight }} px</span>
          <span v-if="state.activeImageIndex >= 0 && state.images[state.activeImageIndex]"> | {{ state.images[state.activeImageIndex].name }}</span>
        </div>
        <div v-if="state.images.length > 0" class="clipgrid-thumbnails">
          <div
            v-for="(img, idx) in state.images"
            :key="img.url"
            class="clipgrid-thumb"
            :class="{ active: idx === state.activeImageIndex }"
            draggable="true"
            @dragstart="onThumbDragStart(idx)"
            @dragover.prevent="onThumbDragOver(idx)"
            @drop.prevent="onThumbDrop(idx)"
          >
            <span class="clipgrid-thumbclose" @click.stop="state.removeImage(idx)">×</span>
            <img :src="img.url" :alt="img.name" @click="state.setActiveImage(idx)" />
            <div class="clipgrid-thumbname">{{ img.name }}</div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="clipgrid-droparea">
          <div class="clipgrid-dropicon">📂</div>
          <div class="clipgrid-dropmsg">Drag and drop image file(s) here</div>
          <div style="height: 12px;"></div>
          <div class="clipgrid-dropmsg">All image files are processed offline</div>
          <div class="clipgrid-dropmsg">(never uploaded to the Internet)</div>
        </div>
      </template>
    </div>
    <div class="clipgrid-side">
      <div v-if="state.coordinates">
        <el-form label-position="top" size="small">
          <el-form-item label="Aspect ratio">
            <el-radio-group v-model="state.aspectRatioMode">
              <el-radio :value="'square'">1:1 Fixed</el-radio>
              <el-radio :value="'free'">Free</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="Left">
            <el-input-number v-model="left" :min="0" :max="state.imageWidth" size="small" style="width: 100%;" @change="applyCoordinatesToCropper" />
            <el-slider v-model="left" :min="0" :max="state.imageWidth" style="width: 100%; margin-top: 4px;" tabindex="-1" @change="applyCoordinatesToCropper" />
          </el-form-item>
          <el-form-item label="Top">
            <el-input-number v-model="top" :min="0" :max="state.imageHeight" size="small" style="width: 100%;" @change="applyCoordinatesToCropper" />
            <el-slider v-model="top" :min="0" :max="state.imageHeight" style="width: 100%; margin-top: 4px;" tabindex="-1" @change="applyCoordinatesToCropper" />
          </el-form-item>
          <el-form-item label="Width">
            <el-input-number v-model="width" :min="1" :max="widthMax" size="small" style="width: 100%;" @change="applyCoordinatesToCropper" />
            <el-slider v-model="width" :min="1" :max="widthMax" style="width: 100%; margin-top: 4px;" tabindex="-1" @change="applyCoordinatesToCropper" />
          </el-form-item>
          <el-form-item label="Height">
            <el-input-number v-model="height" :min="1" :max="heightMax" size="small" style="width: 100%;" @change="applyCoordinatesToCropper" />
            <el-slider v-model="height" :min="1" :max="heightMax" style="width: 100%; margin-top: 4px;" tabindex="-1" @change="applyCoordinatesToCropper" />
          </el-form-item>
          <el-form-item label="Output grid">
            <el-input-number v-model="state.gridCols" :min="1" :max="99" size="small" style="width: 78px;" />
            <span style="margin: 0 6px;">×</span>
            <el-input-number v-model="state.gridRows" :min="1" :max="99" size="small" style="width: 78px;" />
          </el-form-item>
          <el-button
            type="primary"
            style="margin-top: 12px; width: 100%;"
            :disabled="state.isGenerating || state.images.length === 0"
            @click="onGenerateImage"
            class="clipgrid-generate-btn"
          >
            <template v-if="state.isGenerating">
              <i class="el-icon-loading" style="margin-right: 8px;"></i> Generating...
            </template>
            <template v-else>
              Create Image
            </template>
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clipgrid-root {
  display: flex;
  flex-direction: row;
  max-width: 1366px;
  width: 100%;
  min-width: 960px;
  margin: 0 auto;
  min-height: 420px;
}

.clipgrid-main {
  width: 860px;
  min-width: 860px;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  background: #222;
  padding: 24px 12px 24px 32px;
  height: 600px;
  max-height: 90vh;
}

.clipgrid-cropper-wrap {
  width: 100%;
  height: 576px;
  min-height: 384px;
  max-width: 100%;
  max-height: 576px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #222;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
  margin-bottom: 0;
  box-sizing: border-box;
}

.image-info {
  flex-shrink: 0;
  margin-top: 8px;
  color: #ccc;
  font-size: 13px;
  width: 100%;
  text-align: center;
}

.clipgrid-cropper {
  width: 100%;
  height: 100%;
  background: #222;
  min-height: 384px;
  min-width: 384px;
  max-width: 100%;
  max-height: 100%;
  border-radius: 10px;
}

.clipgrid-side {
  width: 240px;
  min-width: 240px;
  max-width: 240px;
  padding: 32px 32px 24px 24px;
  box-sizing: border-box;
  background: #26292c;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border-left: 1px solid #222;
  box-shadow: 0 0 12px 0 #0006;
}

pre {
  background: #333;
  color: #fff;
  padding: 0.5em;
  border-radius: 4px;
  text-align: left;
}
</style>
<style scoped>
.clipgrid-generate-btn:disabled,
.clipgrid-generate-btn.is-disabled {
  background: #333 !important;
  color: #888 !important;
  border-color: #222 !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}
</style>
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

.clipgrid-dropicon {
  font-size: 48px;
  margin-bottom: 16px;
}

.clipgrid-dropmsg {
  font-size: 18px;
  color: #bbb;
}
</style>

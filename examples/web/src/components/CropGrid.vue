<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import { useCropperState } from '../composables/useCropperState';
import ThumbnailList from './ThumbnailList.vue';
import ImageDropArea from './ImageDropArea.vue';
import MessageNotify from './MessageNotify.vue';

/**
 * Provides reactive state and logic for image cropping and grid generation UI.
 * All state mutation is performed via composable methods.
 */
const state = useCropperState();

/**
 * Vue lifecycle hook: Registers window resize event to refresh cropper UI.
 */
onMounted(() => {
  window.addEventListener('resize', refreshCropper);
  window.addEventListener('paste', onGlobalPaste);
});

/**
 * Vue lifecycle hook: Cleans up window resize event on component unmount.
 */
onBeforeUnmount(() => {
  window.removeEventListener('resize', refreshCropper);
  window.removeEventListener('paste', onGlobalPaste);
});

/**
 * Ref for the ImageDropArea component, used to delegate paste handling when visible.
 * @type {import('vue').Ref<InstanceType<typeof ImageDropArea>>}
 */
const imageDropAreaRef = ref();

/**
 * Ref for the cropper component, used to access cropper methods.
 * @type {import('vue').Ref<InstanceType<typeof Cropper>>}
 */
const cropperReady = ref(true);

/**
 * Handles global paste event for image files.
 * If ImageDropArea is visible, delegates to its handlePaste method.
 * Otherwise, extracts image files from clipboard and registers them.
 * @param {ClipboardEvent} e
 */
const onGlobalPaste = (e) => {
  if (imageDropAreaRef.value && typeof imageDropAreaRef.value.handlePaste === 'function') {
    imageDropAreaRef.value.handlePaste(e);
    return;
  }
  // Accept pasted images even if ImageDropArea is hidden
  if (!e.clipboardData) return;
  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
    onImageDropAreaDrop(renameFiles(e.clipboardData.files));
    e.preventDefault();
    return;
  }
  const items = Array.from(e.clipboardData.items || []);
  const imageItems = items.filter(item => item.type.startsWith('image/'));
  if (imageItems.length > 0) {
    const files = imageItems.map(item => item.getAsFile()).filter(Boolean);
    if (files.length > 0) {
      const dt = new DataTransfer();
      renameFiles(files).forEach(f => dt.items.add(f));
      onImageDropAreaDrop(dt.files);
      e.preventDefault();
    }
  }
};

/**
 * Renames files to the format crop_N.ext (crop_1.png, crop_2.jpg, ...).
 * @param {FileList|File[]} files - The files to rename.
 * @returns {FileList} The renamed files as a FileList.
 */
const renameFiles = (files) => {
  const arr = Array.from(files);
  const dt = new DataTransfer();
  arr.forEach((file, i) => {
    const ext = file.name.split('.').pop() || 'png';
    const newName = `crop_${i + 1}.${ext}`;
    const renamed = new File([file], newName, { type: file.type });
    dt.items.add(renamed);
  });
  return dt.files;
};

/**
 * Computed binding for crop left coordinate.
 */
const left = computed({
  get: () => state.coordinates.left,
  set: v => { state.setCoordinates({ left: v }); }
});

/**
 * Computed binding for crop top coordinate.
 */
const top = computed({
  get: () => state.coordinates.top,
  set: v => { state.setCoordinates({ top: v }); }
});

/**
 * Computed maximum values for crop width and height.
 */
const widthMax = computed(() => state.imageWidth);
const heightMax = computed(() => state.imageHeight);

/**
 * Computed binding for crop width, respects aspect ratio mode.
 */
const width = computed({
  get: () => state.coordinates.width,
  set: v => {
    if (state.aspectRatioMode === 'square') {
      state.setCoordinates({ width: v, height: v });
    } else {
      state.setCoordinates({ width: v });
    }
  }
});

/**
 * Computed binding for crop height, respects aspect ratio mode.
 */
const height = computed({
  get: () => state.coordinates.height,
  set: v => {
    if (state.aspectRatioMode === 'square') {
      state.setCoordinates({ width: v, height: v });
    } else {
      state.setCoordinates({ height: v });
    }
  }
});

/**
 * Refreshes the cropper UI (e.g. on window resize).
 */
const refreshCropper = () => {
  if (state.cropperRef && typeof state.cropperRef.refresh === 'function') {
    state.cropperRef.refresh();
  }
};

/**
 * Handles cropper change event and updates coordinates in state.
 * @param {object} e - Cropper event object
 */
const onCropperChange = (e) => {
  state.onCropperChange(e);
};

/**
 * Handles cropper ready event and initializes coordinates in the cropper UI.
 */
const onCropperReady = () => {
  if (state.cropperRef && typeof state.cropperRef.setCoordinates === 'function') {
    // hack: avoid 1px initial width
    if (state.coordinates.width == 1) {
      state.coordinates.width = 500;
    }
    state.cropperRef.setCoordinates({
      ...state.coordinates,
    });
  }
  // HACK: Wait 200ms before enabling thumbnail selection to ensure cropper state is fully stable.
  // This avoids race conditions when switching images rapidly (e.g., multiple thumbnail clicks during image loading).
  setTimeout(() => {
    cropperReady.value = true;
  }, 500);
};

/**
 * Applies the current coordinates to the cropper UI.
 * @param {any} _ (unused event argument for compatibility with @change)
 */
const applyCoordinatesToCropper = (_ = undefined) => {
  state.applyCoordinatesToCropper();
};

/**
 * Handles aspect ratio mode change from the UI.
 * @param {'square'|'free'} v
 */
const onAspectRatioChange = v => {
  state.setAspectRatioMode(v);
};

/**
 * Handles setting the active image from the UI.
 * @param {number} idx
 */
const onSetActiveImage = async idx => {
  if (!cropperReady.value) return;
  cropperReady.value = false;
  await state.setActiveImage(idx);
};

/**
 * Handles removing an image from the UI.
 * @param {number} idx
 */
const onRemoveImage = idx => {
  state.removeImage(idx);
};

/**
 * Computed: true if the coordinates differ from the cropper's current state.
 */
const isDirty = computed(() => {
  const a = state.coordinates, b = state.cropperCurrent;
  return a.left !== b.left || a.top !== b.top || a.width !== b.width || a.height !== b.height;
});

/**
 * Handles image file drop event from ImageDropArea and loads images into state.
 * @param {FileList} files
 */
const onImageDropAreaDrop = (files) => {
  const dt = { files };
  state.onImageDrop({ dataTransfer: dt, preventDefault: () => {} });
};

/**
 * Handles thumbnail reorder event from ThumbnailList.
 * @param {Array} newArr
 */
const onReorderImages = (newArr) => {
  state.images = newArr;
  // activeImageIndexの整合性を保つ
  if (state.activeImageIndex >= newArr.length) {
    state.activeImageIndex = newArr.length - 1;
  } else {
    // 新しい配列内で元のactive画像のindexを再計算
    const activeUrl = state.image;
    const idx = newArr.findIndex(img => img.url === activeUrl);
    if (idx !== -1) state.activeImageIndex = idx;
  }
};

/**
 * Handles the "Create Image" button click. Triggers grid image generation with a short delay.
 */
const onGenerateImage = () => {
  state.isGenerating = true;
  state.infoMessage = 'Generating image... Please wait a moment. Also, please allow pop-ups.';
  setTimeout(() => {
    state.generateImage();
  }, 10);
};

/**
 * Handles dragover event on the root area (Cropper or anywhere).
 * @param {DragEvent} e
 */
const onRootDragOver = (e) => {
  // Optionally, you can add some UI feedback here
  e.preventDefault();
};

/**
 * Handles drop event on the root area (Cropper or anywhere).
 * @param {DragEvent} e
 */
const onRootDrop = (e) => {
  // If drop target is inside ImageDropArea, skip (to avoid double registration)
  if (e.target.closest && e.target.closest('.cropgrid-droparea')) {
    return;
  }
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    onImageDropAreaDrop(e.dataTransfer.files);
  }
  e.preventDefault();
};
</script>
<template>
  <div class="cropgrid-root">
    <!-- Notification for error messages -->
    <MessageNotify :message="state.errorMessage" type="error" />
    <!-- Notification for info messages -->
    <MessageNotify :message="state.infoMessage" type="info" />
    <div class="cropgrid-main">
      <template v-if="state.image">
        <div class="cropgrid-cropper-wrap" @dragover.prevent="onRootDragOver" @drop.prevent="onRootDrop">
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
            :resize-image="false"
            :resize-stencil="false"
            class="cropgrid-cropper"
            @change="onCropperChange"
            @ready="onCropperReady"
          />
        </div>
        <div class="image-info">
          <span>{{ state.imageWidth }} x {{ state.imageHeight }} px</span>
          <span v-if="state.activeImageIndex >= 0 && state.images[state.activeImageIndex]"> | {{ state.images[state.activeImageIndex].name }}</span>
        </div>
        <ThumbnailList
          v-if="state.images.length > 0"
          :images="state.images"
          :active-index="state.activeImageIndex"
          :disabled="!cropperReady"
          @select="onSetActiveImage"
          @remove="onRemoveImage"
          @reorder="onReorderImages"
          class="cropgrid-thumbnails"
        />
      </template>
      <template v-else>
        <ImageDropArea ref="imageDropAreaRef" @drop="onImageDropAreaDrop" class="cropgrid-droparea" />
      </template>
    </div>
    <div class="cropgrid-side">
      <div v-if="state.coordinates">
        <el-form label-position="top" size="small">
          <el-form-item label="Aspect ratio">
            <el-radio-group :model-value="state.aspectRatioMode" @change="onAspectRatioChange">
              <el-radio :value="'square'">1:1 Fixed</el-radio>
              <el-radio :value="'free'">Free</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="Left">
            <el-input-number v-model="left" :min="0" :max="state.imageWidth" size="small" style="width: 100%;" @change="v => applyCoordinatesToCropper(v)" />
            <el-slider v-model="left" :min="0" :max="state.imageWidth" style="width: 100%; margin-top: 4px;" tabindex="-1" @change="v => applyCoordinatesToCropper(v)" />
          </el-form-item>
          <el-form-item label="Top">
            <el-input-number v-model="top" :min="0" :max="state.imageHeight" size="small" style="width: 100%;" @change="v => applyCoordinatesToCropper(v)" />
            <el-slider v-model="top" :min="0" :max="state.imageHeight" style="width: 100%; margin-top: 4px;" tabindex="-1" @change="v => applyCoordinatesToCropper(v)" />
          </el-form-item>
          <el-form-item label="Width">
            <el-input-number v-model="width" :min="1" :max="widthMax" size="small" style="width: 100%;" @change="v => applyCoordinatesToCropper(v)" />
            <el-slider v-model="width" :min="1" :max="widthMax" style="width: 100%; margin-top: 4px;" tabindex="-1" @change="v => applyCoordinatesToCropper(v)" />
          </el-form-item>
          <el-form-item label="Height">
            <el-input-number v-model="height" :min="1" :max="heightMax" size="small" style="width: 100%;" @change="v => applyCoordinatesToCropper(v)" />
            <el-slider v-model="height" :min="1" :max="heightMax" style="width: 100%; margin-top: 4px;" tabindex="-1" @change="v => applyCoordinatesToCropper(v)" />
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
            class="cropgrid-generate-btn"
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
.cropgrid-root {
  display: flex;
  flex-direction: row;
  max-width: 1366px;
  width: 100%;
  min-width: 960px;
  margin: 0 auto;
  min-height: 420px;
}

.cropgrid-main {
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

.cropgrid-cropper-wrap {
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

.cropgrid-cropper {
  width: 100%;
  height: 100%;
  background: #222;
  min-height: 384px;
  min-width: 384px;
  max-width: 100%;
  max-height: 100%;
  border-radius: 10px;
}

.cropgrid-side {
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

.cropgrid-generate-btn:disabled,
.cropgrid-generate-btn.is-disabled {
  background: #333 !important;
  color: #888 !important;
  border-color: #222 !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}

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

.cropgrid-droparea {
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

.cropgrid-dropicon {
  font-size: 48px;
  margin-bottom: 16px;
}

.cropgrid-dropmsg {
  font-size: 18px;
  color: #bbb;
}
</style>

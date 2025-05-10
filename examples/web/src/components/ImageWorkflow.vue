<script setup lang="ts">
/**
 * ImageWorkflow.vue
 *
 * Generic workflow component for image-based tasks (e.g. grid, mosaic, collage, etc).
 * Provides a UI and state management for:
 *   - Image file drop and paste
 *   - Thumbnail list and reordering
 *   - Crop area selection (with aspect ratio)
 *   - Image generation (delegated to a strategy)
 *
 * Props:
 *   - strategy: { generateImage: Function } - The image generation logic/strategy to use
 *   - composableFactory: Function - Factory to create the workflow state (should accept strategy)
 *   - title: string (optional) - Title for the workflow/tab
 *
 * Emits: none (all state is managed internally or via composable)
 *
 * Usage:
 *   <ImageWorkflow :strategy="GridService" :composableFactory="useGridState" title="Grid" />
 *
 * This component is designed to be reused for different image processing tabs by injecting different strategies and state composables.
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { ImageGenerationService } from '../services/ImageGenerationService';
import ThumbnailList from './ThumbnailList.vue';
import ImageDropArea from './ImageDropArea.vue';
import MessageNotify from './MessageNotify.vue';
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

/**
 * Props for ImageWorkflow component.
 * @typedef {Object} ImageWorkflowProps
 * @property {ImageGenerationService} strategy - The image generation strategy object
 * @property {(strategy: ImageGenerationService) => any} composableFactory - State composable factory
 * @property {string} [title] - Optional workflow title
 */
interface ImageWorkflowProps {
  strategy: ImageGenerationService;
  composableFactory: (strategy: ImageGenerationService) => any;
  title?: string;
}
const props = defineProps<ImageWorkflowProps>();

/**
 * State object returned from the injected composable factory.
 * Contains all workflow state and methods for the current strategy.
 */
const state = props.composableFactory(props.strategy);

/**
 * Ref to the ImageDropArea child component instance.
 * @type {import('vue').Ref<InstanceType<typeof ImageDropArea>|undefined>}
 */
const imageDropAreaRef = ref();

/**
 * Whether the cropper UI is ready for interaction.
 * @type {import('vue').Ref<boolean>}
 */
const cropperReady = ref(true);

/**
 * Computed property for the left coordinate of the crop area.
 * @type {import('vue').WritableComputedRef<number>}
 */
const left = computed({
  get: () => state.coordinates.left,
  set: v => { state.setCoordinates({ left: v }); }
});

/**
 * Computed property for the top coordinate of the crop area.
 * @type {import('vue').WritableComputedRef<number>}
 */
const top = computed({
  get: () => state.coordinates.top,
  set: v => { state.setCoordinates({ top: v }); }
});

/**
 * Computed property for the maximum crop width (image width).
 * @type {import('vue').ComputedRef<number>}
 */
const widthMax = computed(() => state.imageWidth);

/**
 * Computed property for the maximum crop height (image height).
 * @type {import('vue').ComputedRef<number>}
 */
const heightMax = computed(() => state.imageHeight);

/**
 * Computed property for the crop width, with setter supporting aspect ratio mode.
 * @type {import('vue').WritableComputedRef<number>}
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
 * Computed property for the crop height, with setter supporting aspect ratio mode.
 * @type {import('vue').WritableComputedRef<number>}
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
 * Refreshes the cropper UI (e.g. after resize).
 */
const refreshCropper = () => {
  if (state.cropperRef && typeof state.cropperRef.refresh === 'function') {
    state.cropperRef.refresh();
  }
};

/**
 * Vue lifecycle: Register global event listeners on mount.
 * - Refreshes cropper on window resize
 * - Handles image paste events
 */
onMounted(() => {
  window.addEventListener('resize', refreshCropper);
  window.addEventListener('paste', onGlobalPaste);
});

/**
 * Vue lifecycle: Remove global event listeners on unmount.
 * - Prevents memory leaks and unwanted event triggers
 */
onBeforeUnmount(() => {
  window.removeEventListener('resize', refreshCropper);
  window.removeEventListener('paste', onGlobalPaste);
});

/**
 * Handles global paste events for image input.
 * @param {ClipboardEvent} e
 */
const onGlobalPaste = (e) => {
  if (imageDropAreaRef.value && typeof imageDropAreaRef.value.handlePaste === 'function') {
    imageDropAreaRef.value.handlePaste(e);
    return;
  }
  if (!e.clipboardData) return;
  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
    onImageDropAreaDrop(renameFiles(e.clipboardData.files));
    e.preventDefault();
    return;
  }
  const items: DataTransferItem[] = Array.from(e.clipboardData.items || []);
  const imageItems = items.filter((item: DataTransferItem) => item.type.startsWith('image/'));
  if (imageItems.length > 0) {
    const files = imageItems.map((item: DataTransferItem) => item.getAsFile()).filter((f): f is File => !!f);
    if (files.length > 0) {
      const dt = new DataTransfer();
      Array.from(renameFiles(files)).forEach((f: File) => dt.items.add(f));
      onImageDropAreaDrop(dt.files);
      e.preventDefault();
    }
  }
};

/**
 * Renames files to a standard format for cropping (crop_1.png, ...).
 * @param {FileList | File[]} files
 * @returns {FileList}
 */
const renameFiles = (files: FileList | File[]): FileList => {
  const arr: File[] = Array.from(files);
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
 * Handles files dropped onto the ImageDropArea.
 * @param {FileList|File[]} files
 */
const onImageDropAreaDrop = (files) => {
  const dt = { files };
  state.onImageDrop({ dataTransfer: dt, preventDefault: () => {} });
};

/**
 * Handles cropper change events (crop area moved/resized).
 * @param {any} e
 */
const onCropperChange = (e) => {
  state.onCropperChange(e);
};

/**
 * Called when the cropper is ready. Applies initial coordinates and enables UI.
 */
const onCropperReady = () => {
  if (state.cropperRef && typeof state.cropperRef.setCoordinates === 'function') {
    if (state.coordinates.width == 1) {
      state.coordinates.width = 500;
    }
    state.cropperRef.setCoordinates({ ...state.coordinates });
  }
  setTimeout(() => {
    cropperReady.value = true;
  }, 500);
};

/**
 * Applies the current coordinates to the cropper UI.
 * @param {any} [_] - Unused
 */
const applyCoordinatesToCropper = (_ = undefined) => {
  state.applyCoordinatesToCropper();
};

/**
 * Handles aspect ratio mode change (square/free).
 * @param {string} v
 */
const onAspectRatioChange = v => {
  state.setAspectRatioMode(v);
};

/**
 * Sets the active image for cropping by index.
 * @param {number} idx
 */
const onSetActiveImage = async idx => {
  if (!cropperReady.value) return;
  cropperReady.value = false;
  await state.setActiveImage(idx);
};

/**
 * Removes an image from the workflow by index.
 * @param {number} idx
 */
const onRemoveImage = idx => {
  state.removeImage(idx);
};

/**
 * Handles reordering of images in the thumbnail list.
 * @param {Array} newArr
 */
const onReorderImages = (newArr) => {
  state.images = newArr;
  if (state.activeImageIndex >= newArr.length) {
    state.activeImageIndex = newArr.length - 1;
  } else {
    const activeUrl = state.image;
    const idx = newArr.findIndex(img => img.url === activeUrl);
    if (idx !== -1) state.activeImageIndex = idx;
  }
};

/**
 * Triggers image generation using the current strategy and state.
 */
const onGenerateImage = () => {
  state.isGenerating = true;
  state.infoMessage = '';
  nextTick(() => {
    state.infoMessage = 'Generating image... Please wait a moment. Also, please allow pop-ups.';
    nextTick(() => {
      state.generateImage();
    });
  });
};

/**
 * Prevents default dragover behavior on the root element.
 * @param {DragEvent} e
 */
const onRootDragOver = (e) => { e.preventDefault(); };

/**
 * Handles file drop on the root element (outside drop area).
 * @param {DragEvent} e
 */
const onRootDrop = (e) => {
  if (e.target.closest && e.target.closest('.cropgrid-droparea')) return;
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    onImageDropAreaDrop(e.dataTransfer.files);
  }
  e.preventDefault();
};
</script>
<template>
  <div class="imageworkflow-root">
    <MessageNotify :message="state.errorMessage" type="error" />
    <MessageNotify :message="state.infoMessage" type="info" />
    <div class="imageworkflow-main">
      <template v-if="state.image">
        <div class="imageworkflow-cropper-wrap" @dragover.prevent="onRootDragOver" @drop.prevent="onRootDrop">
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
            class="imageworkflow-cropper"
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
          class="imageworkflow-thumbnails"
        />
      </template>
      <template v-else>
        <ImageDropArea ref="imageDropAreaRef" @drop="onImageDropAreaDrop" class="imageworkflow-droparea" />
      </template>
    </div>
    <div class="imageworkflow-side">
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
            :loading="state.isGenerating"
            @click="onGenerateImage"
            class="imageworkflow-generate-btn"
          >
            <template v-if="state.isGenerating">
              Generating...
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
.imageworkflow-root {
  display: flex;
  flex-direction: row;
  max-width: 1366px;
  width: 100%;
  min-width: 960px;
  margin: 0 auto;
  min-height: 420px;
}

.imageworkflow-main {
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

.imageworkflow-cropper-wrap {
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

.imageworkflow-cropper {
  width: 100%;
  height: 100%;
  background: #222;
  min-height: 384px;
  min-width: 384px;
  max-width: 100%;
  max-height: 100%;
  border-radius: 10px;
}

.imageworkflow-side {
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

.imageworkflow-generate-btn {
  height: 44px !important;
  font-size: 0.9em;
}
.imageworkflow-generate-btn:disabled,
.imageworkflow-generate-btn.is-disabled {
  background: #333 !important;
  color: #fff !important;
  border-color: #222 !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}

.imageworkflow-thumbnails {
  display: flex;
  flex-direction: row;
  gap: 12px;
  margin: 18px 0 0 0;
  flex-wrap: wrap;
  justify-content: center;
}

.imageworkflow-droparea {
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
</style>

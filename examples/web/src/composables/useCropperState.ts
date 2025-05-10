import type { ImageGenerationService } from '../services/ImageGenerationService';
import { reactive } from 'vue';

/**
 * State and logic for image cropping and grid generation.
 */
class CropperState {
  /**
   * The image generation strategy/service injected from the outside.
   * @type {object|undefined}
   */
  strategy: ImageGenerationService | undefined = undefined;

  /**
   * The current error message, if any. This should be watched by the UI layer
   * and displayed using any notification method (e.g., toast, dialog).
   * Set to null when there is no error.
   * @type {string|null}
   */
  errorMessage: string | null = null;

  /**
   * The current info message, if any. This should be watched by the UI layer
   * and displayed using any notification method (e.g., toast, dialog).
   * Set to null when there is no info.
   * @type {string|null}
   */
  infoMessage: string | null = null;

  /**
   * Current aspect ratio mode for cropping ('square' or 'free').
   * Controls the aspect ratio of the cropper UI.
   * @type {'square' | 'free'}
   */
  aspectRatioMode: 'square' | 'free' = 'square';

  /**
   * Reference to the Cropper component instance.
   * Used for programmatic control of the cropper UI.
   * @type {any}
   */
  cropperRef: any = null;

  /**
   * Current crop coordinates (left, top, width, height).
   * Bound to the cropper UI and updated by user interaction.
   * @type {{ left: number, top: number, width: number, height: number }}
   *
   * Now: Proxy to images[activeImageIndex].coordinates if available.
   */
  get coordinates() {
    if (this.activeImageIndex >= 0 && this.images[this.activeImageIndex]) {
      return this.images[this.activeImageIndex].coordinates;
    }
    return { left: 0, top: 0, width: 500, height: 500 };
  }
  set coordinates(val) {
    if (this.activeImageIndex >= 0 && this.images[this.activeImageIndex]) {
      // Synchronize coordinates for all images
      for (const img of this.images) {
        img.coordinates = { ...val };
      }
    }
  }

  /**
   * The cropper's last known coordinates (used for dirty checking).
   * @type {{ left: number, top: number, width: number, height: number }}
   */
  cropperCurrent = { left: 0, top: 0, width: 500, height: 500 };

  /**
   * Number of columns in the output grid image.
   * @type {number}
   */
  gridCols = 3;

  /**
   * Number of rows in the output grid image.
   * @type {number}
   */
  gridRows = 3;

  /**
   * List of uploaded images with metadata, per-image coordinates, and optional OffscreenCanvas.
   * @type {Array<{ name: string; url: string; coordinates: { left: number, top: number, width: number, height: number }, canvas?: OffscreenCanvas }>}
   */
  images: { name: string; url: string; coordinates: { left: number, top: number, width: number, height: number }, canvas?: OffscreenCanvas }[] = [];

  /**
   * Index of the currently active image in the images array. -1 if no image is active.
   * @type {number}
   */
  activeImageIndex: number = -1;

  // lastCoordinates is no longer needed; use image.coordinates directly

  /**
   * Data URL of the currently active image.
   * @type {string}
   */
  image: string = '';

  /**
   * Width of the currently active image (in pixels).
   * @type {number}
   */
  imageWidth = 500;

  /**
   * Height of the currently active image (in pixels).
   * @type {number}
   */
  imageHeight = 500;

  /**
   * True if the output image is currently being generated.
   * @type {boolean}
   */
  isGenerating = false;

  /**
   * Sets crop coordinates and applies to cropper if needed.
   * @param coords Coordinates to update (partial)
   * @param applyToCropper Whether to apply to cropper UI (default: true)
   */
  setCoordinates(
    coords: Partial<{ left: number; top: number; width: number; height: number }>,
    applyToCropper = true
  ) {
    this.coordinates = { ...this.coordinates, ...coords };
    if (applyToCropper) {
      this.applyCoordinatesToCropper();
    }
  }

  /**
   * Sets the aspect ratio mode and adjusts coordinates if needed.
   * @param mode 'square' or 'free'
   */
  setAspectRatioMode(mode: 'square' | 'free') {
    const oldMode = this.aspectRatioMode;
    this.aspectRatioMode = mode;
    if (oldMode === 'free' && mode === 'square') {
      const minSide = Math.min(this.imageWidth, this.imageHeight);
      let newValue = Math.min(this.coordinates.width, this.coordinates.height, minSide);
      this.setCoordinates({ width: newValue, height: newValue });
    } else if (oldMode === 'square' && mode === 'free') {
      // Ensure cropper UI is synced when switching to free mode
      this.applyCoordinatesToCropper();
    }
  }

  /**
   * Returns the numeric aspect ratio value for the cropper.
   * @returns {number|undefined} 1 for square, undefined for free mode
   */
  get aspectRatioValue() {
    return this.aspectRatioMode === 'square' ? 1 : undefined;
  }

  /**
   * Updates the image size and crop coordinates based on the given image source.
   * @param {string} src - Image source URL
   * @param {boolean} [keepCoordinates=false] - Whether to keep previous coordinates
   */
  async updateImageSize(src: string, keepCoordinates: boolean = false) {
    if (!src) return;
    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        this.imageWidth = img.naturalWidth;
        this.imageHeight = img.naturalHeight;
        // always use the image's own coordinates, or set default if not present
        const imgObj = this.images.find(i => i.url === src);
        if (imgObj && keepCoordinates && imgObj.coordinates) {
          this.coordinates = { ...imgObj.coordinates };
        } else {
          const cropW = Math.floor(img.naturalWidth / 2);
          const cropH = cropW;
          const cropL = Math.floor((img.naturalWidth - cropW) / 2);
          const cropT = Math.floor((img.naturalHeight - cropH) / 2);
          this.coordinates = {
            left: cropL,
            top: cropT,
            width: cropW,
            height: cropH,
          };
        }
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Handles cropper change event and updates coordinates.
   * @param {{ coordinates: { left: number, top: number, width: number, height: number } }} param0
   */
  onCropperChange({ coordinates: coords }: { coordinates: any }) {
    if (coords) {
      const rounded = {
        left: Math.round(coords.left),
        top: Math.round(coords.top),
        width: Math.round(coords.width),
        height: Math.round(coords.height),
      };
      this.coordinates = rounded;
      this.cropperCurrent = { ...rounded };
    }
  }

  /**
   * Applies the current coordinates to the cropper UI.
   */
  applyCoordinatesToCropper() {
    if (this.cropperRef && this.cropperRef.setCoordinates) {
      this.cropperRef.setCoordinates({
        left: this.coordinates.left,
        top: this.coordinates.top,
        width: this.coordinates.width,
        height: this.coordinates.height,
      });
      this.cropperCurrent = { ...this.coordinates };
    }
  }

  /**
   * Handles image file drop event and loads images into state.
   * After all files are loaded, sorts the images by file name.
   * Now implemented with Promise for all file reads.
   * @param {DragEvent} e - The drag event containing files
   */
  async onImageDrop(e: DragEvent) {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      // Show info message while registering images
      this.infoMessage = 'Registering image files...';
      // Get DataURL for all files using Promise
      const readFileAsDataURL = (file: File) => new Promise<{ name: string; url: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          resolve({ name: file.name, url });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      try {
        const newImages = await Promise.all(Array.from(files).map(file => readFileAsDataURL(file)));
        // Sort by file name
        newImages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        // Add to existing images
        for (const img of newImages) {
          // Set initial coordinates
          this.images.push({
            name: img.name,
            url: img.url,
            coordinates: { left: 0, top: 0, width: 500, height: 500 },
          });
        }
        // Set the last added image as active
        this.activeImageIndex = this.images.length - 1;
        this.image = this.images[this.activeImageIndex].url;
        await this.updateImageSize(this.image, true);
        this.infoMessage = null;
      } catch (err) {
        this.errorMessage = 'Failed to read one or more files.';
        this.infoMessage = null;
      }
    }
  }

  /**
   * Sets the active image by index and updates coordinates.
   * @param {number} idx - Index of the image to activate
   */
  async setActiveImage(idx: number) {
    if (idx >= 0 && idx < this.images.length) {
      this.activeImageIndex = idx;
      const nextUrl = this.images[idx].url;
      this.image = nextUrl;
      await this.updateImageSize(this.image, true);
    }
  }

  /**
   * Removes an image from the list by index and updates active image.
   * @param {number} idx - Index of the image to remove
   */
  async removeImage(idx: number) {
    if (typeof idx !== 'number' || idx < 0 || idx >= this.images.length) return;
    this.images.splice(idx, 1);
    if (this.images.length === 0) {
      this.activeImageIndex = -1;
      this.image = '';
    } else {
      // If the active image was removed, select previous or first
      if (this.activeImageIndex === idx) {
        const nextIdx = idx > 0 ? idx - 1 : 0;
        this.activeImageIndex = nextIdx;
        this.image = this.images[nextIdx].url;
      } else if (this.activeImageIndex > idx) {
        this.activeImageIndex--;
      }
      await this.updateImageSize(this.image, true);
    }
  }

  /**
   * Generates the output grid image using the injected strategy (service) and opens it in a new tab.
   * @param {ImageGenerationService} [strategy] - Optional image generation strategy (must have generateImage)
   */
  async generateImage(strategy?: ImageGenerationService) {
    if (this.images.length === 0) {
      this.errorMessage = 'No images available. Cannot generate grid image.';
      return;
    }
    this.errorMessage = null;
    this.isGenerating = true;

    // Use injected strategy if provided, otherwise fallback to legacy import (for direct use)
    const service: ImageGenerationService | undefined = strategy || this.strategy;
    if (!service) {
      this.errorMessage = 'No image generation strategy provided.';
      this.isGenerating = false;
      return;
    }

    const result = await service.generateImage({
      images: this.images,
      gridCols: this.gridCols,
      gridRows: this.gridRows,
    });
    if (result.ok && result.blobUrl) {
      window.open(result.blobUrl, '_blank');
      this.errorMessage = null;
    } else {
      this.errorMessage = result.error || 'Failed to generate grid image.';
    }
    this.isGenerating = false;
  }
}

/**
 * Factory for CropperState. Accepts an optional strategy/service for image generation.
 * @param {ImageGenerationService} [strategy] - Optional image generation strategy (service)
 * @returns {CropperState}
 */
export function useCropperState(strategy?: ImageGenerationService) {
  const state = reactive(new CropperState());
  if (strategy) {
    (state as any).strategy = strategy;
  }
  return state;
}

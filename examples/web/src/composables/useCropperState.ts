import { reactive } from 'vue';
import { cropAndGridImages } from '../utils/sazan-helper';

/**
 * State and logic for image cropping and grid generation.
 */
class CropperState {
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
   */
  coordinates = { left: 0, top: 0, width: 100, height: 100 };

  /**
   * The cropper's last known coordinates (used for dirty checking).
   * @type {{ left: number, top: number, width: number, height: number }}
   */
  cropperCurrent = { left: 0, top: 0, width: 100, height: 100 };

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
   * List of uploaded images with metadata and optional OffscreenCanvas.
   * @type {Array<{ name: string; url: string; canvas?: OffscreenCanvas }>}
   */
  images: { name: string; url: string; canvas?: OffscreenCanvas }[] = [];

  /**
   * Index of the currently active image in the images array. -1 if no image is active.
   * @type {number}
   */
  activeImageIndex: number = -1;

  /**
   * Last used crop coordinates (for restoring when switching images). Null if not available.
   * @type {{ left: number, top: number, width: number, height: number } | null}
   */
  lastCoordinates: { left: number, top: number, width: number, height: number } | null = null;

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
        if (keepCoordinates && this.lastCoordinates) {
          this.coordinates = {
            left: this.lastCoordinates.left,
            top: this.lastCoordinates.top,
            width: this.lastCoordinates.width,
            height: this.lastCoordinates.height,
          };
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
          this.images.push({ name: img.name, url: img.url });
        }
        // Set the last added image as active
        this.activeImageIndex = this.images.length - 1;
        if (this.image) {
          this.lastCoordinates = { ...this.coordinates };
        } else {
          this.lastCoordinates = null;
        }
        this.image = this.images[this.activeImageIndex].url;
        await this.updateImageSize(this.image, !!this.lastCoordinates);
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
      if (this.image) {
        this.lastCoordinates = { ...this.coordinates };
      } else {
        this.lastCoordinates = null;
      }
      this.activeImageIndex = idx;
      await this.updateImageSize(this.image, !!this.lastCoordinates);
      this.image = this.images[idx].url;
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
   * Asynchronously creates and sets an OffscreenCanvas for the given image object if not already present.
   * @param {object} imgObj - { name, url, canvas? }
   * @returns {Promise<void>}
   */
  async ensureImageCanvas(imgObj: { name: string; url: string; canvas?: OffscreenCanvas }): Promise<void> {
    if (imgObj.canvas) return;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imgObj.url;
      img.onload = () => {
        try {
          const offscreenCanvas = new OffscreenCanvas(img.width, img.height);
          const ctx = offscreenCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            imgObj.canvas = offscreenCanvas;
            resolve();
          } else {
            reject(new Error('Failed to get 2d context'));
          }
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image: ' + imgObj.name));
    });
  }

  /**
   * Generates the output grid image from cropped images using sazan-wasm and opens it in a new tab.
   */
  async generateImage() {
    if (this.images.length === 0) {
      this.errorMessage = 'No images available. Cannot generate grid image.';
      return;
    }
    this.errorMessage = null;
    this.isGenerating = true;

    // Await creation of OffscreenCanvas for all images
    try {
      await Promise.all(this.images.map(imgObj => this.ensureImageCanvas(imgObj)));
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to load one or more images.';
      this.isGenerating = false;
      return;
    }
    // Collect RGBA data and determine the maximum image size
    let maxWidth = 0, maxHeight = 0;
    for (const imgObj of this.images) {
      if (imgObj.canvas) {
        maxWidth = Math.max(maxWidth, imgObj.canvas.width);
        maxHeight = Math.max(maxHeight, imgObj.canvas.height);
      }
    }
    const rgbaImages: Uint8ClampedArray[] = [];
    for (const imgObj of this.images) {
      if (!imgObj.canvas) {
        this.errorMessage = `Failed to load image: ${imgObj.name}`;
        this.isGenerating = false;
        return;
      }
      const srcCanvas = imgObj.canvas;
      // Use the existing canvas for images with the maximum size
      if (srcCanvas.width === maxWidth && srcCanvas.height === maxHeight) {
        const imageData = srcCanvas.getContext('2d')!.getImageData(0, 0, maxWidth, maxHeight);
        rgbaImages.push(imageData.data);
      } else {
        // For other images, create a new OffscreenCanvas for resizing
        const dstCanvas = new OffscreenCanvas(maxWidth, maxHeight);
        const dstCtx = dstCanvas.getContext('2d');
        if (!dstCtx) {
          this.errorMessage = `Failed to create resize canvas for image: ${imgObj.name}`;
          this.isGenerating = false;
          return;
        }
        dstCtx.drawImage(srcCanvas, 0, 0);
        const imageData = dstCtx.getImageData(0, 0, maxWidth, maxHeight);
        rgbaImages.push(imageData.data);
      }
    }
    const imageWidth = maxWidth;
    const imageHeight = maxHeight;

    try {
      const gridCols = this.gridCols;
      const gridRows = this.gridRows;
      const cellWidth = this.coordinates.width;
      const cellHeight = this.coordinates.height;
      // Use the helper to generate the output RGBA
      const outRgba = cropAndGridImages(
        rgbaImages,
        imageWidth,
        imageHeight,
        this.coordinates.left,
        this.coordinates.top,
        this.coordinates.width,
        this.coordinates.height,
        gridCols,
        gridRows
      );

      // Create output OffscreenCanvas and put the RGBA data
      const outCanvas = new OffscreenCanvas(gridCols * cellWidth, gridRows * cellHeight);
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) {
        this.errorMessage = 'Failed to create output canvas.';
        this.isGenerating = false;
        return;
      }
      const outImageData = new ImageData(
        new Uint8ClampedArray(outRgba),
        outCanvas.width,
        outCanvas.height
      );
      outCtx.putImageData(outImageData, 0, 0);
      // Convert OffscreenCanvas to Blob and open in new tab
      outCanvas.convertToBlob({ type: 'image/png' }).then(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          this.isGenerating = false;
          this.errorMessage = null;
        } else {
          this.errorMessage = 'Failed to create image Blob.';
          this.isGenerating = false;
          this.infoMessage = null;
        }
      }).catch(e => {
        this.errorMessage = 'An error occurred while creating the image Blob.';
        this.isGenerating = false;
        this.infoMessage = null;
      });
    } catch (e) {
      this.errorMessage = 'Failed to generate grid image using Wasm.';
      this.isGenerating = false;
      this.infoMessage = null;
    }
  }
}

/**
 * Provides a reactive CropperState instance for use in Vue components.
 * @returns {CropperState}
 */
export function useCropperState() {
  return reactive(new CropperState());
}

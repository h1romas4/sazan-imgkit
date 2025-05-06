import { reactive } from 'vue';

/**
 * State and logic for image cropping and grid generation.
 */

export class CropperState {
  aspectRatioMode: 'square' | 'free' = 'square';
  cropperRef: any = null;
  coordinates = { left: 0, top: 0, width: 100, height: 100 };
  cropperCurrent = { left: 0, top: 0, width: 100, height: 100 };
  gridCols = 3;
  gridRows = 3;

  images: { name: string; url: string; canvas?: OffscreenCanvas }[] = [];
  activeImageIndex: number = -1;
  lastCoordinates: { left: number, top: number, width: number, height: number } | null = null;
  image: string = '';
  imageWidth = 500;
  imageHeight = 500;
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
  updateImageSize(src: string, keepCoordinates: boolean = false) {
    if (!src) return;
    const img = new window.Image();
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
    };
    img.src = src;
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
   * @param {DragEvent} e - The drag event containing files
   */
  onImageDrop(e: DragEvent) {
    // Get files from the drag event
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      // Loop through each dropped file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        // Read file as DataURL
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          // Add image to state and update active index
          this.images.push({ name: file.name, url });
          this.activeImageIndex = this.images.length - 1;
          // Save last coordinates if an image is already loaded
          if (this.image) {
            this.lastCoordinates = { ...this.coordinates };
          } else {
            this.lastCoordinates = null;
          }
          // Set new image and update size/coordinates
          this.image = url;
          this.updateImageSize(this.image, !!this.lastCoordinates);

          // Load image and extract RGBA data using OffscreenCanvas
          const img = new Image();
          img.onload = () => {
            // Create OffscreenCanvas and draw image
            const offscreenCanvas = new OffscreenCanvas(img.width, img.height);
            const ctx = offscreenCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              // Get RGBA pixel data
              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              const rgbaData = imageData.data; // RGBA data
              // Attach canvas to image object in state
              const existingImage = this.images.find(image => image.url === url);
              if (existingImage) {
                existingImage.canvas = offscreenCanvas;
              } else {
                this.images.push({ name: file.name, url, canvas: offscreenCanvas });
              }
            }
            // Sort images by filename
            this.images.sort((a, b) => a.name.localeCompare(b.name));
          };
          img.src = url;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  /**
   * Sets the active image by index and updates coordinates.
   * @param {number} idx - Index of the image to activate
   */
  setActiveImage(idx: number) {
    if (idx >= 0 && idx < this.images.length) {
      if (this.image) {
        this.lastCoordinates = { ...this.coordinates };
      } else {
        this.lastCoordinates = null;
      }
      this.activeImageIndex = idx;
      this.image = this.images[idx].url;
      this.updateImageSize(this.image, !!this.lastCoordinates);
    }
  }

  /**
   * Removes an image from the list by index and updates active image.
   * @param {number} idx - Index of the image to remove
   */
  removeImage(idx: number) {
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
        this.updateImageSize(this.image, false);
      } else if (this.activeImageIndex > idx) {
        this.activeImageIndex--;
      }
    }
  }

  /**
   * Generates the output grid image from cropped images and opens it in a new tab.
   */
  generateImage() {
    // Return early if there are no images
    if (this.images.length === 0) {
      console.error('No images available to generate the grid.');
      return;
    }
    // Set generating state
    this.isGenerating = true;

    // Check if the first image has a canvas (sanity check)
    const firstImageCanvas = this.images[0].canvas;
    if (!firstImageCanvas) {
      console.error('First image does not have an associated canvas.');
      this.isGenerating = false;
      return;
    }

    // Get crop cell size
    const cellWidth = this.coordinates.width;
    const cellHeight = this.coordinates.height;
    // Create output canvas and context
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context.');
      this.isGenerating = false;
      return;
    }

    // Get grid size
    const gridCols = this.gridCols;
    const gridRows = this.gridRows;
    // Set output canvas size
    canvas.width = gridCols * cellWidth;
    canvas.height = gridRows * cellHeight;

    // Track loaded images
    let loadedCount = 0;
    this.images.forEach((image, index) => {
      // Calculate grid position
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      // Skip images that don't fit in the grid
      if (row >= gridRows) return;
      // Load image and draw cropped region to output canvas
      const img = new Image();
      img.onload = () => {
        const { left, top, width, height } = this.coordinates;
        ctx.drawImage(
          img,
          left, // Crop start x
          top,  // Crop start y
          width, // Crop width
          height, // Crop height
          col * cellWidth, // Destination x
          row * cellHeight, // Destination y
          cellWidth, // Destination width
          cellHeight // Destination height
        );
        loadedCount++;
        // When all images are loaded, output the result
        if (loadedCount === this.images.length) {
          // Create a Blob and open it in a new tab
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              this.isGenerating = false;
            }
          }, 'image/png');
        }
      };
      // Handle image load error
      img.onerror = () => {
        console.error(`Failed to load image: ${image.url}`);
        loadedCount++;
        if (loadedCount === this.images.length) {
          this.isGenerating = false;
        }
      };
      img.src = image.url;
    });
  }
}

/**
 * Provides a reactive CropperState instance for use in Vue components.
 * @returns {CropperState}
 */
export function useCropperState() {
  return reactive(new CropperState());
}

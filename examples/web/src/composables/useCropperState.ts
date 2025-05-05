import { reactive } from 'vue'

export class CropperState {
  aspectRatioMode = 'square' // 'square' or 'free'
  cropperRef: any = null
  coordinates = { left: 0, top: 0, width: 100, height: 100 }
  cropperCurrent = { left: 0, top: 0, width: 100, height: 100 }
  gridCols = 3
  gridRows = 3

  images: { name: string; url: string; canvas?: OffscreenCanvas }[] = [];
  activeImageIndex: number = -1
  lastCoordinates: { left: number, top: number, width: number, height: number } | null = null
  image: string = '';
  imageWidth = 500
  imageHeight = 500
  isGenerating = false;

  get aspectRatioValue() {
    return this.aspectRatioMode === 'square' ? 1 : undefined
  }

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

  onCropperChange({ coordinates: coords }: { coordinates: any }) {
    if (coords) {
      const rounded = {
        left: Math.round(coords.left),
        top: Math.round(coords.top),
        width: Math.round(coords.width),
        height: Math.round(coords.height),
      }
      this.coordinates = rounded
      this.cropperCurrent = { ...rounded }
    }
  }

  applyCoordinatesToCropper() {
    if (this.cropperRef && this.cropperRef.setCoordinates) {
      this.cropperRef.setCoordinates({
        left: this.coordinates.left,
        top: this.coordinates.top,
        width: this.coordinates.width,
        height: this.coordinates.height,
      })
      this.cropperCurrent = { ...this.coordinates }
    }
  }

  onImageDrop(e: DragEvent) {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          this.images.push({ name: file.name, url });
          this.activeImageIndex = this.images.length - 1;
          if (this.image) {
            this.lastCoordinates = { ...this.coordinates };
          } else {
            this.lastCoordinates = null;
          }
          this.image = url;
          this.updateImageSize(this.image, !!this.lastCoordinates);

          // RGBA データを取得 (OffscreenCanvas を使用)
          const img = new Image();
          img.onload = () => {
            const offscreenCanvas = new OffscreenCanvas(img.width, img.height);
            const ctx = offscreenCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              const rgbaData = imageData.data; // RGBA データ
              const existingImage = this.images.find(image => image.url === url);
              if (existingImage) {
                existingImage.canvas = offscreenCanvas;
              } else {
                this.images.push({ name: file.name, url, canvas: offscreenCanvas });
              }
            }
            this.images.sort((a, b) => a.name.localeCompare(b.name));
          };
          img.src = url;
        };
        reader.readAsDataURL(file);
      }
    }
  }

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

  removeImage(idx: number) {
    if (typeof idx !== 'number' || idx < 0 || idx >= this.images.length) return;
    this.images.splice(idx, 1);
    if (this.images.length === 0) {
      this.activeImageIndex = -1;
      this.image = '';
    } else {
      // アクティブが消えた場合は直前、または先頭
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

  generateImage() {
    if (this.images.length === 0) {
      console.error('No images available to generate the grid.');
      return;
    }

    this.isGenerating = true;

    const firstImageCanvas = this.images[0].canvas;
    if (!firstImageCanvas) {
      console.error('First image does not have an associated canvas.');
      this.isGenerating = false;
      return;
    }

    const cellWidth = this.coordinates.width;
    const cellHeight = this.coordinates.height;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context.');
      this.isGenerating = false;
      return;
    }

    const gridCols = this.gridCols;
    const gridRows = this.gridRows;

    canvas.width = gridCols * cellWidth;
    canvas.height = gridRows * cellHeight;

    let loadedCount = 0;
    this.images.forEach((image, index) => {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);

      if (row >= gridRows) return; // Skip images that don't fit in the grid

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

export function useCropperState() {
  return reactive(new CropperState())
}

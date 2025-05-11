/**
 * Create a PNG Blob from raw RGBA data and dimensions using OffscreenCanvas.
 * @param opts Object with { rgba, width, height }
 * @returns Promise<Blob | null>
 */
export async function canvasToPngBlob(opts: { rgba: Uint8Array<ArrayBufferLike>, width: number, height: number }): Promise<Blob | null> {
  const { rgba, width, height } = opts;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  ctx.putImageData(imageData, 0, 0);
  return await canvas.convertToBlob({ type: 'image/png' });
}

/**
 * Normalize an array of images to the maximum width and height among them, returning RGBA arrays.
 * @param images Array of image objects (must have .canvas)
 * @returns { maxWidth: number, maxHeight: number, rgbaImages: Uint8ClampedArray[] }
 */
export function normalizeImagesToMaxSize(images: { name: string; canvas?: OffscreenCanvas }[]): { maxWidth: number, maxHeight: number, rgbaImages: Uint8ClampedArray[] } {
  let maxWidth = 0, maxHeight = 0;
  for (const imgObj of images) {
    if (imgObj.canvas) {
      maxWidth = Math.max(maxWidth, imgObj.canvas.width);
      maxHeight = Math.max(maxHeight, imgObj.canvas.height);
    }
  }
  const rgbaImages: Uint8ClampedArray[] = [];
  for (const imgObj of images) {
    if (!imgObj.canvas) throw new Error(`No canvas for image: ${imgObj.name}`);
    const srcCanvas = imgObj.canvas;
    if (srcCanvas.width === maxWidth && srcCanvas.height === maxHeight) {
      const imageData = srcCanvas.getContext('2d')!.getImageData(0, 0, maxWidth, maxHeight);
      rgbaImages.push(imageData.data);
    } else {
      const dstCanvas = new OffscreenCanvas(maxWidth, maxHeight);
      const dstCtx = dstCanvas.getContext('2d');
      if (!dstCtx) throw new Error(`Failed to create resize canvas for image: ${imgObj.name}`);
      dstCtx.drawImage(srcCanvas, 0, 0);
      const imageData = dstCtx.getImageData(0, 0, maxWidth, maxHeight);
      rgbaImages.push(imageData.data);
    }
  }
  return { maxWidth, maxHeight, rgbaImages };
}
/**
 * Ensure each image object in the array has an OffscreenCanvas (creates one if missing).
 * @param images Array of image objects (must have .url)
 * @returns Promise<void>
 */
export async function ensureOffscreenCanvasForImages(images: { name: string; url: string; canvas?: OffscreenCanvas }[]): Promise<void> {
  await Promise.all(images.map(async imgObj => {
    if (!imgObj.canvas) {
      await new Promise<void>((resolve, reject) => {
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
  }));
}

/**
 * Release OffscreenCanvas references for all image objects in the array (set to undefined).
 * @param images Array of image objects
 */
export function releaseOffscreenCanvasForImages(images: { canvas?: OffscreenCanvas }[]): void {
  for (const imgObj of images) {
    imgObj.canvas = undefined;
  }
}

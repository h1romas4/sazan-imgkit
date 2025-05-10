import { cropAndGridImages } from '../utils/sazan-helper';
import { ensureOffscreenCanvasForImages, releaseOffscreenCanvasForImages, normalizeImagesToMaxSize } from '../utils/canvas-helper';

/**
 * Parameters for generating a crop grid image.
 * @property images Array of image objects (must include .url, .coordinates, and optionally .canvas)
 * @property gridCols Number of columns in the output grid
 * @property gridRows Number of rows in the output grid
 */
export interface CropGridImageParams {
  images: { name: string; url: string; coordinates: { left: number, top: number, width: number, height: number }, canvas?: OffscreenCanvas }[];
  gridCols: number;
  gridRows: number;
}

/**
 * Result of crop grid image generation.
 * @property ok True if successful, false otherwise
 * @property error Error message if failed
 * @property blobUrl Blob URL of the generated PNG image if successful
 */
export interface CropGridImageResult {
  ok: boolean;
  error?: string;
  blobUrl?: string;
}

/**
 * Generates a grid image from an array of cropped images.
 *
 * - Uses the crop coordinates of the first image for all crops.
 * - Normalizes all images to the maximum width/height among the inputs.
 * - Returns a PNG image as a Blob URL on success, or an error message on failure.
 * - Handles OffscreenCanvas creation and memory release internally.
 *
 * @param params.images Array of image objects (must include .url, .coordinates, and optionally .canvas)
 * @param params.gridCols Number of columns in the output grid
 * @param params.gridRows Number of rows in the output grid
 * @returns {Promise<CropGridImageResult>} Result object: { ok, blobUrl?, error? }
 */
export async function generateCropGridImage(params: CropGridImageParams): Promise<CropGridImageResult> {
  const { images, gridCols, gridRows } = params;
  if (!images.length) return { ok: false, error: 'No images available.' };

  // Ensure all images have OffscreenCanvas
  try {
    await ensureOffscreenCanvasForImages(images);
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Failed to load one or more images.' };
  }

  // Use the coordinates of the first image
  const coordinatesToUse = images[0]?.coordinates || { left: 0, top: 0, width: 100, height: 100 };

  // Normalize all images to the maximum size
  let maxWidth: number, maxHeight: number, rgbaImages: Uint8ClampedArray[];
  try {
    ({ maxWidth, maxHeight, rgbaImages } = normalizeImagesToMaxSize(images));
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Failed to normalize images.' };
  }
  const imageWidth = maxWidth;
  const imageHeight = maxHeight;

  try {
    const cellWidth = coordinatesToUse.width;
    const cellHeight = coordinatesToUse.height;
    const outRgba = cropAndGridImages(
      rgbaImages,
      imageWidth,
      imageHeight,
      coordinatesToUse.left,
      coordinatesToUse.top,
      coordinatesToUse.width,
      coordinatesToUse.height,
      gridCols,
      gridRows
    );
    const outCanvas = new OffscreenCanvas(gridCols * cellWidth, gridRows * cellHeight);
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) {
      return { ok: false, error: 'Failed to create output canvas.' };
    }
    const outImageData = new ImageData(
      new Uint8ClampedArray(outRgba),
      outCanvas.width,
      outCanvas.height
    );
    outCtx.putImageData(outImageData, 0, 0);
    const blob = await outCanvas.convertToBlob({ type: 'image/png' });
    if (!blob) return { ok: false, error: 'Failed to create image Blob.' };
    const url = URL.createObjectURL(blob);
    return { ok: true, blobUrl: url };
  } catch (e) {
    return { ok: false, error: 'Failed to generate grid image using Wasm.' };
  } finally {
    // Release OffscreenCanvas references for memory cleanup
    releaseOffscreenCanvasForImages(images);
  }
}

import { cropAndGridImages } from '../utils/sazan-helper';
import { ensureOffscreenCanvasForImages, releaseOffscreenCanvasForImages, normalizeImagesToMaxSize, canvasToPngBlob } from '../utils/canvas-helper';
import type { ImageGenerationService, ImageGenerationParams, ImageGenerationResult } from './ImageGenerationService';

/**
 * CropSplitService: Implements ImageGenerationService for split image generation.
 */
export const CropSplitService: ImageGenerationService = {
  /**
   * Generates a split image from an array of cropped images.
   *
   * - Uses the crop coordinates of the first image for all crops.
   * - Normalizes all images to the maximum width/height among the inputs.
   * - Returns a PNG image as a Blob URL on success, or an error message on failure.
   * - Handles OffscreenCanvas creation and memory release internally.
   *
   * @param params.images Array of image objects (must include .url, .coordinates, and optionally .canvas)
   * @param params.gridCols Number of columns in the output grid
   * @param params.gridRows Number of rows in the output grid
   * @returns {Promise<ImageGenerationResult>} Result object: { ok, blobUrl?, error? }
   */
  async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
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
      const gridRgba = cropAndGridImages(
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
      const blob = await canvasToPngBlob({
        rgba: gridRgba,
        width: gridCols * cellWidth,
        height: gridRows * cellHeight
      });
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
};

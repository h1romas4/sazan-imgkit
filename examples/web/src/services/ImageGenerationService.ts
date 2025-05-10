/**
 * Parameters for image generation services.
 * Used as the argument for ImageGenerationService.generateImage.
 */
export interface ImageGenerationParams {
  images: Array<{ name: string; url: string; coordinates: { left: number; top: number; width: number; height: number }; canvas?: OffscreenCanvas }>;
  gridCols: number;
  gridRows: number;
}

/**
 * Result type for image generation services.
 * Used as the return value for ImageGenerationService.generateImage.
 */
export interface ImageGenerationResult {
  ok: boolean;
  error?: string;
  blobUrl?: string;
}

/**
 * Interface for image generation strategy/service.
 * Defines the contract for any image generation service (e.g. grid, mosaic, collage).
 */
export interface ImageGenerationService {
  generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult>;
}

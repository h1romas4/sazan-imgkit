import { crop_and_grid_images } from 'sazan-wasm';

/**
 * flattenImagesToRgba
 * Utility to flatten multiple ImageData or Uint8ClampedArray (RGBA) arrays into a single Uint8Array (RGBA).
 *
 * @param images Array of RGBA pixel arrays. Each element should be a Uint8ClampedArray or Uint8Array of length (width * height * 4) per image.
 * @type {(Uint8ClampedArray | Uint8Array)[]}
 * @returns Flattened Uint8Array (suitable for passing to wasm)
 */
export function flattenImagesToRgba(images: (Uint8ClampedArray | Uint8Array)[]): Uint8Array {
  const totalLength = images.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of images) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Wrapper for sazan-wasm's crop_and_grid_images.
 *
 * @param images Array of RGBA pixel arrays. Each element should be a Uint8ClampedArray or Uint8Array of length (width * height * 4) per image.
 * @type {(Uint8ClampedArray | Uint8Array)[]}
 * @param imageWidth Width of each input image
 * @param imageHeight Height of each input image
 * @param cropLeft Crop start x
 * @param cropTop Crop start y
 * @param cropWidth Crop width
 * @param cropHeight Crop height
 * @param gridCols Number of grid columns
 * @param gridRows Number of grid rows
 * @returns Uint8Array RGBA bytes of the output grid image
 */
export function cropAndGridImages(
  images: (Uint8ClampedArray | Uint8Array)[],
  imageWidth: number,
  imageHeight: number,
  cropLeft: number,
  cropTop: number,
  cropWidth: number,
  cropHeight: number,
  gridCols: number,
  gridRows: number
): Uint8Array {
  const flat = flattenImagesToRgba(images);
  // Call sazan-wasm's crop_and_grid_images
  // crop_and_grid_images(images_rgba, image_width, image_height, num_images, crop_left, crop_top, crop_width, crop_height, grid_cols, grid_rows)
  return crop_and_grid_images(
    flat,
    imageWidth,
    imageHeight,
    images.length,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    gridCols,
    gridRows
  );
}

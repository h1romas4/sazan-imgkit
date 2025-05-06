/* tslint:disable */
/* eslint-disable */
/**
 * Greets from sazan-wasm (for test)
 */
export function greet(): string;
/**
 * Crops and grids multiple RGBA images and returns the result as RGBA bytes.
 *
 * # Arguments
 * * `images_rgba` - RGBA pixels of all images, concatenated (len = image_width * image_height * 4 * num_images)
 * * `image_width` - width of each input image
 * * `image_height` - height of each input image
 * * `num_images` - number of images
 * * `crop_left` - crop start x
 * * `crop_top` - crop start y
 * * `crop_width` - crop width
 * * `crop_height` - crop height
 * * `grid_cols` - output grid columns
 * * `grid_rows` - output grid rows
 *
 * # Returns
 * RGBA bytes of the output grid image
 */
export function crop_and_grid_images(images_rgba: Uint8Array, image_width: number, image_height: number, num_images: number, crop_left: number, crop_top: number, crop_width: number, crop_height: number, grid_cols: number, grid_rows: number): Uint8Array;

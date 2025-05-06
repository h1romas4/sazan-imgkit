mod utils;

use wasm_bindgen::prelude::*;
use sazan::crop_and_grid_images as sazan_crop_and_grid_images;

/// Greets from sazan-wasm (for test)
#[wasm_bindgen]
pub fn greet() -> String {
    "Hello, sazan-wasm!".to_string()
}

/// Crops and grids multiple RGBA images and returns the result as RGBA bytes.
///
/// # Arguments
/// * `images_rgba` - RGBA pixels of all images, concatenated (len = image_width * image_height * 4 * num_images)
/// * `image_width` - width of each input image
/// * `image_height` - height of each input image
/// * `num_images` - number of images
/// * `crop_left` - crop start x
/// * `crop_top` - crop start y
/// * `crop_width` - crop width
/// * `crop_height` - crop height
/// * `grid_cols` - output grid columns
/// * `grid_rows` - output grid rows
///
/// # Returns
/// RGBA bytes of the output grid image
#[wasm_bindgen]
pub fn crop_and_grid_images(
    images_rgba: &[u8],
    image_width: u32,
    image_height: u32,
    num_images: u32,
    crop_left: u32,
    crop_top: u32,
    crop_width: u32,
    crop_height: u32,
    grid_cols: u32,
    grid_rows: u32,
) -> Vec<u8> {
    // Since the image is RGBA, each pixel is 4 bytes
    let bytes_per_pixel = 4; // RGBA
    let single_len = (image_width * image_height * bytes_per_pixel) as usize;
    let mut images = Vec::with_capacity(num_images as usize);
    for i in 0..num_images as usize {
        let start = i * single_len;
        let end = start + single_len;
        if end > images_rgba.len() { break; }
        // Use sazan's dynamic_image_from_rgba_bytes (signature: &[u8], u32, u32) -> DynamicImage
        let img = sazan::dynamic_image_from_rgba_bytes(&images_rgba[start..end], image_width, image_height);
        images.push(img);
    }
    // Call sazan's crop_and_grid_images (signature: images: &[DynamicImage], crop: (u32, u32, u32, u32), cols: usize, rows: usize)
    let crop = (crop_width, crop_height, crop_left, crop_top);
    let out_img = sazan_crop_and_grid_images(
        &images,
        crop,
        grid_cols as usize,
        grid_rows as usize,
    );
    // Convert output image to RGBA bytes
    let out_rgba = out_img.to_rgba8();
    out_rgba.into_raw()
}

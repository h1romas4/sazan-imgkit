use image::{DynamicImage, GenericImageView, RgbaImage, GenericImage};

/// Converts raw RGBA bytes (from browser ImageData) to a DynamicImage.
///
/// # Arguments
/// * `rgba` - RGBA bytes (length = width * height * 4)
/// * `width` - image width
/// * `height` - image height
///
/// # Returns
/// * `DynamicImage` - the constructed image
pub fn dynamic_image_from_rgba_bytes(rgba: &[u8], width: u32, height: u32) -> DynamicImage {
    let img = RgbaImage::from_raw(width, height, rgba.to_vec())
        .expect("Invalid buffer length for image dimensions");
    DynamicImage::ImageRgba8(img)
}

/// Load images, crop, and combine into a grid
///
/// # Arguments
/// * `paths` - image file paths
/// * `crop` - (width, height, x, y)
/// * `cols` - grid columns
/// * `rows` - grid rows
///
/// # Returns
/// * Ok(DynamicImage) - combined image
/// * Err(ImageError) - if any error occurs
pub fn crop_and_grid_images(
    images: &[DynamicImage],
    crop: (u32, u32, u32, u32),
    cols: usize,
    rows: usize,
) -> DynamicImage {
    let cropped_images = crop_images(images, crop);
    combine_grid(cropped_images, cols, rows)
}

/// Crops each image in the given vector to the specified rectangle and returns a vector of cropped images.
///
/// # Arguments
///
/// * `images` - A slice of images to crop.
/// * `crop` - A tuple `(width, height, x, y)` specifying the crop rectangle for each image.
///
/// # Returns
///
/// * `Vec<DynamicImage>` - A vector of cropped images.
pub fn crop_images(
    images: &[DynamicImage],
    crop: (u32, u32, u32, u32),
) -> Vec<DynamicImage> {
    images
        .iter()
        .map(|img| img.crop_imm(crop.2, crop.3, crop.0, crop.1))
        .collect()
}

/// Combines images into a grid layout and returns a single combined image.
///
/// # Arguments
///
/// * `images` - A vector of images to arrange in the grid. All images must be the same size.
/// * `cols` - Number of columns in the grid.
/// * `rows` - Number of rows in the grid.
///
/// # Panics
///
/// Panics if `images.len() != cols * rows` or if the images are not all the same size.
///
/// # Returns
///
/// * `DynamicImage` - The combined image arranged in the specified grid.
pub fn combine_grid(
    images: Vec<DynamicImage>,
    cols: usize,
    rows: usize,
) -> DynamicImage {
    let total = cols * rows;
    let (w, h) = if !images.is_empty() {
        images[0].dimensions()
    } else {
        (1, 1) // fallback: 1x1 transparent if no images at all
    };
    let mut canvas = RgbaImage::new(w * cols as u32, h * rows as u32);
    for i in 0..total {
        let x = (i % cols) as u32 * w;
        let y = (i / cols) as u32 * h;
        if i < images.len() {
            canvas.copy_from(&images[i], x, y).unwrap();
        } else {
            // Fill with transparent if not enough images
            let empty = RgbaImage::from_pixel(w, h, image::Rgba([0, 0, 0, 0]));
            canvas.copy_from(&DynamicImage::ImageRgba8(empty), x, y).unwrap();
        }
    }
    DynamicImage::ImageRgba8(canvas)
}

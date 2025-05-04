use std::io::Write;
use image::{DynamicImage, GenericImageView, RgbaImage, GenericImage};

/// Splits a single image into a grid of tiles and returns a ZIP archive (in memory) containing each tile as a PNG file.
///
/// # Arguments
/// * `image` - Source image to split
/// * `crop_size` - (width, height) of each tile
/// * `grid` - (columns, rows) grid size
/// * `filename_prefix` - Prefix for each PNG file in the zip (e.g. "tile")
///
/// # Returns
/// * `Ok(Vec<u8>)` - ZIP archive as bytes (in memory)
/// * `Err` - If any error occurs during processing
/// Crops and splits multiple images into a grid of tiles each, starting from a given offset, and returns a ZIP archive (in memory) containing each tile as a PNG file.
///
/// # Arguments
/// * `images` - Source images to crop and split (each image will be processed independently)
/// * `crop_size` - (width, height) of each tile
/// * `offset` - (x, y) start position (top-left) for the grid cropping in each image
/// * `grid` - (columns, rows) grid size
/// * `filename_prefix` - Prefix for each PNG file in the zip (e.g. "tile")
///
/// # Returns
/// * `Ok(Vec<u8>)` - ZIP archive as bytes (in memory)
/// * `Err` - If any error occurs during processing
pub fn crop_split_image_to_zip(
    images: &[DynamicImage],
    crop_size: (u32, u32),
    offset: (u32, u32),
    grid: (usize, usize),
    filename_prefix: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    use zip::write::FileOptions;
    use zip::ZipWriter;
    use image::ImageOutputFormat;
    let (tile_w, tile_h) = crop_size;
    let (offset_x, offset_y) = offset;
    let (cols, rows) = grid;
    let mut buffer = std::io::Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(&mut buffer);
    let options = FileOptions::default().compression_method(zip::CompressionMethod::Stored);

    for (img_idx, image) in images.iter().enumerate() {
        for row in 0..rows {
            for col in 0..cols {
                let x = offset_x + col as u32 * tile_w;
                let y = offset_y + row as u32 * tile_h;
                let cropped = image.crop_imm(x, y, tile_w, tile_h);
                let mut png_bytes = std::io::Cursor::new(Vec::new());
                cropped.write_to(&mut png_bytes, ImageOutputFormat::Png)?;
                let filename = format!("{}_{:02}_{:02}_{:02}.png", filename_prefix, img_idx, row, col);
                zip.start_file(filename, options)?;
                zip.write_all(&png_bytes.into_inner())?;
            }
        }
    }
    let _ = zip.finish()?;
    // Explicitly drop zip to release the borrow on buffer
    drop(zip);
    Ok(buffer.into_inner())
}

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
fn crop_images(
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
fn combine_grid(
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

use regex::Regex;
use clap::{Parser, Subcommand};
use sazan::{crop_and_grid_images, crop_split_image_to_zip};
use std::path::Path;

#[derive(Parser, Debug)]
#[command(author, version, about)]
struct Args {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Crop and montage images into a grid
    CropGrid {
        /// Image files (wildcard, e.g. images/*.png)
        #[arg(required = true)]
        images: Vec<String>,

        /// Output file name (default: result.png)
        #[arg(short, long, default_value = "result.png")]
        output: String,

        /// Crop parameter in the format WIDTHxHEIGHT+X+Y (e.g. 1265x1265+1422+366).
        /// WIDTH and HEIGHT specify the crop size, X and Y specify the top-left offset in the source image.
        #[arg(short, long, value_parser = parse_crop_param_clap)]
        crop: (u32, u32, u32, u32),

        /// Grid size (e.g. 3x3, 4x2)
        #[arg(short, long, required = true, value_parser = parse_grid_param_clap)]
        grid: (usize, usize),
    },
    /// Crop and split images into tiles and save as a ZIP archive
    CropSplit {
        /// Image files (wildcard, e.g. images/*.png)
        #[arg(required = true)]
        images: Vec<String>,

        /// Output ZIP file name (default: result.zip)
        #[arg(short, long, default_value = "result.zip")]
        output: String,

        /// Crop parameter in the format WIDTHxHEIGHT+X+Y (e.g. 256x256+0+0)
        /// WIDTH and HEIGHT specify the crop size, X and Y specify the top-left offset in the source image.
        #[arg(short, long, value_parser = parse_crop_param_clap)]
        crop: (u32, u32, u32, u32),

        /// Grid size (e.g. 3x3, 4x2)
        #[arg(short, long, required = true, value_parser = parse_grid_param_clap)]
        grid: (usize, usize),

        /// Filename prefix for tiles in the zip (default: tile)
        #[arg(long, default_value = "tile")]
        prefix: String,
    },
}

/// For clap value_parser: parses a string like "1265x1265+1422+366" into a tuple (width, height, x, y).
///
/// # Arguments
/// * `s` - A crop parameter string, e.g., "1265x1265+1422+366"
///
/// # Returns
/// * `Ok((u32, u32, u32, u32))` - A tuple (width, height, x, y) on success
/// * `Err(String)` - An error message if parsing fails
fn parse_crop_param_clap(s: &str) -> Result<(u32, u32, u32, u32), String> {
    let re = Regex::new(r"^(\d+)x(\d+)\+(\d+)\+(\d+)$").unwrap();
    re.captures(s).and_then(|cap| {
        Some((
            cap[1].parse().ok()?,
            cap[2].parse().ok()?,
            cap[3].parse().ok()?,
            cap[4].parse().ok()?,
        ))
    }).ok_or_else(|| format!("Invalid crop format: {}", s))
}

/// For clap value_parser: parses a string like "3x3" into a tuple (3, 3).
///
/// # Arguments
/// * `s` - A grid parameter string, e.g., "3x3"
///
/// # Returns
/// * `Ok((usize, usize))` - A tuple (cols, rows) on success
/// * `Err(String)` - An error message if parsing fails
fn parse_grid_param_clap(s: &str) -> Result<(usize, usize), String> {
    let re = Regex::new(r"^(\d+)x(\d+)$").unwrap();
    re.captures(s).and_then(|cap| {
        Some((
            cap[1].parse().ok()?,
            cap[2].parse().ok()?,
        ))
    }).ok_or_else(|| format!("Invalid grid format: {}", s))
}

/// Loads images from file paths, crops them, arranges them in a grid, and saves the result to a file.
///
/// # Arguments
/// * `images` - List of image file paths (will be sorted)
/// * `output` - Output file path for the combined image
/// * `crop` - Crop rectangle as (width, height, x, y)
/// * `grid` - Grid size as (columns, rows)
///
/// # Behavior
/// - Loads each image from the given paths (exits on error)
/// - Crops each image to the specified rectangle
/// - Arranges the cropped images in a grid (fills with transparency if not enough images)
/// - Saves the result to the specified output file (exits on error)
fn run_crop_grid(images: Vec<String>, output: String, crop: (u32, u32, u32, u32), grid: (usize, usize)) {
    // Sort image file paths
    let mut images = images;
    images.sort();

    // Load images from file paths
    let mut loaded_images = Vec::with_capacity(images.len());
    for path in &images {
        match image::open(Path::new(path)) {
            Ok(img) => loaded_images.push(img),
            Err(e) => {
                eprintln!("Failed to open image '{}': {}", path, e);
                std::process::exit(1);
            }
        }
    }

    // Extract grid and crop parameters
    let (cols, rows) = grid;

    // Crop and combine images into a grid
    let result_img = crop_and_grid_images(&loaded_images, crop, cols, rows);

    // Save the output image file
    if let Err(e) = result_img.save(&output) {
        eprintln!("Failed to save output image: {}", e);
        std::process::exit(1);
    }
    println!("Saved output image to {}", output);
}

/// Loads images from file paths, splits them into tiles, and saves the result as a ZIP archive.
///
/// # Arguments
/// * `images` - List of image file paths (will be sorted)
/// * `output` - Output ZIP file path
/// * `crop_size` - Tile size as (width, height)
/// * `offset` - Start position (x, y) for cropping in each image
/// * `grid` - Grid size as (columns, rows)
/// * `prefix` - Filename prefix for tiles in the zip
///
/// # Behavior
/// - Loads each image from the given paths (exits on error)
/// - Splits each image into tiles of the specified size and grid, starting from the offset
/// - Saves all tiles as PNG files in a ZIP archive at the specified output path (exits on error)
fn run_crop_split(images: Vec<String>, output: String, crop: (u32, u32, u32, u32), grid: (usize, usize), prefix: String) {
    // Sort image file paths
    let mut images = images;
    images.sort();

    // Load images from file paths
    let mut loaded_images = Vec::with_capacity(images.len());
    for path in &images {
        match image::open(Path::new(path)) {
            Ok(img) => loaded_images.push(img),
            Err(e) => {
                eprintln!("Failed to open image '{}': {}", path, e);
                std::process::exit(1);
            }
        }
    }

    // Crop and split images, then zip
    let (crop_w, crop_h, crop_x, crop_y) = crop;
    match crop_split_image_to_zip(&loaded_images, (crop_w, crop_h), (crop_x, crop_y), grid, &prefix) {
        Ok(zip_bytes) => {
            if let Err(e) = std::fs::write(&output, zip_bytes) {
                eprintln!("Failed to write zip file '{}': {}", output, e);
                std::process::exit(1);
            }
            println!("Saved zip archive to {}", output);
        }
        Err(e) => {
            eprintln!("Failed to create zip archive: {}", e);
            std::process::exit(1);
        }
    }
}

fn main() {
    // Parse command-line arguments
    let args = Args::parse();

    match args.command {
        Commands::CropGrid { images, output, crop, grid } => {
            run_crop_grid(images, output, crop, grid);
        }
        Commands::CropSplit { images, output, crop, grid, prefix } => {
            run_crop_split(images, output, crop, grid, prefix);
        }
    }
}

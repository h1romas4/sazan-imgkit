# sazan-imgkit

sazan-imgkit is a flexible Rust image processing toolkit and CLI for cropping, gridding, splitting, and combining images.

It supports both command-line and WebAssembly (Wasm) use cases, enabling advanced batch image manipulation workflows. Features include robust cropping and tiling, grid montage, in-memory ZIP export, and extensible subcommand-based CLI design. Ideal for automation, web, and creative pipelines.

## Usage

### Web Frontend

🔗 [https://h1romas4.github.io/sazan-imgkit/](https://h1romas4.github.io/sazan-imgkit/)

![alt text](assets/images/sazan-imgkit-frontend.png)

Image © KOEI TECMO GAMES CO., LTD. from “Atelier Resleriana”

### CLI

#### `sazan crop-grid`

Crop and montage images into a grid.

```bash
Usage: sazan crop-grid [OPTIONS] --crop <CROP> --grid <GRID> <IMAGES>...

Arguments:
  <IMAGES>...  Image files (wildcard, e.g. images/*.png)

Options:
  -o, --output <OUTPUT>  Output file name (default: result.png) [default: result.png]
  -c, --crop <CROP>      Crop parameter in the format WIDTHxHEIGHT+X+Y (e.g. 1265x1265+1422+366). WIDTH and HEIGHT specify the crop size, X and Y specify the top-left offset in the source image
  -g, --grid <GRID>      Grid size (e.g. 3x3, 4x2)
  -h, --help             Print help
```

```bash
$ cargo run --release --bin sazan -- crop-grid --crop 2048x2048+684+0 --grid 3x3 tests/souryoku_20250504/pose/*.png -o test.png
```

#### `sazan crop-split`

Crop and split images into tiles and save as a ZIP archive.

```bash
Usage: sazan crop-split [OPTIONS] --crop <CROP> --grid <GRID> <IMAGES>...

Arguments:
  <IMAGES>...  Image files (wildcard, e.g. images/*.png)

Options:
  -o, --output <OUTPUT>  Output ZIP file name (default: result.zip) [default: result.zip]
  -c, --crop <CROP>      Crop parameter in the format WIDTHxHEIGHT+X+Y (e.g. 256x256+0+0) WIDTH and HEIGHT specify the crop size, X and Y specify the top-left offset in the source image
  -g, --grid <GRID>      Grid size (e.g. 3x3, 4x2)
      --prefix <PREFIX>  Filename prefix for tiles in the zip (default: tile) [default: tile]
  -h, --help             Print help
```

```bash
$ cargo run --release --bin sazan -- crop-split --crop 2048x2048+0+0 --grid 3x3 test.png -o result.zip
```

## License

BSD 3-Clause License

## Build

```bash
cargo build --release
cd components/sazan-wasm
wasm-pack build
cd -
cd examples/web
npm install
npm run build # (or npm run dev)
```

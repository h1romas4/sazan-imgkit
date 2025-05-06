let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}


const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
/**
 * Greets from sazan-wasm (for test)
 * @returns {string}
 */
export function greet() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.greet();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
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
 * @param {Uint8Array} images_rgba
 * @param {number} image_width
 * @param {number} image_height
 * @param {number} num_images
 * @param {number} crop_left
 * @param {number} crop_top
 * @param {number} crop_width
 * @param {number} crop_height
 * @param {number} grid_cols
 * @param {number} grid_rows
 * @returns {Uint8Array}
 */
export function crop_and_grid_images(images_rgba, image_width, image_height, num_images, crop_left, crop_top, crop_width, crop_height, grid_cols, grid_rows) {
    const ptr0 = passArray8ToWasm0(images_rgba, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.crop_and_grid_images(ptr0, len0, image_width, image_height, num_images, crop_left, crop_top, crop_width, crop_height, grid_cols, grid_rows);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_export_0;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
    ;
};


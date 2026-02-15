/**
 * Generate a proper multi-resolution .ico file from logo.png
 * Includes 16x16, 32x32, 48x48, and 256x256 layers
 * Adds subtle enhancements for small-size visibility
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'public', 'img', 'logo.png');
const OUT_ICO_WEB = path.join(__dirname, '..', 'public', 'img', 'logo.ico');
const OUT_ICO_ACARS = path.join(__dirname, '..', 'acars-app', 'src', 'assets', 'logo.ico');
const OUT_ICO_ACARS_PUBLIC = path.join(__dirname, '..', 'acars-app', 'public', 'logo.ico');
const OUT_PNG_256 = path.join(__dirname, '..', 'public', 'img', 'logo-256.png');

// ICO file format writer
function createIco(images) {
    // ICO header: 6 bytes
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);      // Reserved
    header.writeUInt16LE(1, 2);      // Type: 1 = ICO
    header.writeUInt16LE(images.length, 4); // Number of images

    // Directory entries: 16 bytes each
    const dirEntries = [];
    let dataOffset = 6 + (images.length * 16);

    for (const img of images) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);   // Width (0 = 256)
        entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1); // Height (0 = 256)
        entry.writeUInt8(0, 2);          // Color palette
        entry.writeUInt8(0, 3);          // Reserved
        entry.writeUInt16LE(1, 4);       // Color planes
        entry.writeUInt16LE(32, 6);      // Bits per pixel
        entry.writeUInt32LE(img.data.length, 8);  // Size of image data
        entry.writeUInt32LE(dataOffset, 12);       // Offset to image data
        dirEntries.push(entry);
        dataOffset += img.data.length;
    }

    return Buffer.concat([header, ...dirEntries, ...images.map(i => i.data)]);
}

async function generate() {
    console.log('Reading source:', SOURCE);
    const src = sharp(SOURCE);
    const meta = await src.metadata();
    console.log(`Source: ${meta.width}x${meta.height}, ${meta.channels} channels, format: ${meta.format}`);

    const sizes = [16, 32, 48, 256];
    const images = [];

    for (const size of sizes) {
        // 5% padding on all sizes so icon never touches edges
        const margin = Math.max(1, Math.round(size * 0.05));
        const innerSize = size - (margin * 2);

        // Create a 1px semi-transparent contrast border (visible on both dark & light backgrounds)
        const borderWidth = size <= 32 ? 1 : size <= 48 ? 1 : 2;
        const contentSize = innerSize - (borderWidth * 2);

        // Build the border overlay as an SVG circle/rect
        const borderSvg = Buffer.from(
            `<svg width="${innerSize}" height="${innerSize}">
                <rect x="0" y="0" width="${innerSize}" height="${innerSize}" rx="${Math.round(innerSize * 0.15)}" ry="${Math.round(innerSize * 0.15)}"
                    fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="${borderWidth}"/>
            </svg>`
        );

        const resized = await sharp(SOURCE)
            .resize(contentSize, contentSize, {
                fit: 'contain',
                background: '#00000000',
                kernel: 'lanczos3',
            })
            .sharpen(size <= 32 ? 1.5 : 0.5)
            .extend({
                top: borderWidth,
                bottom: borderWidth,
                left: borderWidth,
                right: borderWidth,
                background: '#00000000',
            })
            .composite([{ input: borderSvg, blend: 'over' }])
            .extend({
                top: margin,
                bottom: margin,
                left: margin,
                right: margin,
                background: '#00000000',
            })
            .png()
            .toBuffer();

        images.push({ width: size, height: size, data: resized });
        console.log(`  Generated ${size}x${size} (${resized.length} bytes, margin=${margin}px, border=${borderWidth}px)`);
    }

    // Build ICO
    const ico = createIco(images);

    // Write to all locations
    fs.writeFileSync(OUT_ICO_WEB, ico);
    console.log(`Written: ${OUT_ICO_WEB} (${ico.length} bytes)`);

    fs.writeFileSync(OUT_ICO_ACARS, ico);
    console.log(`Written: ${OUT_ICO_ACARS} (${ico.length} bytes)`);

    fs.writeFileSync(OUT_ICO_ACARS_PUBLIC, ico);
    console.log(`Written: ${OUT_ICO_ACARS_PUBLIC} (${ico.length} bytes)`);

    // Also save the 256px PNG for preview
    const png256 = images.find(i => i.width === 256);
    if (png256) {
        fs.writeFileSync(OUT_PNG_256, png256.data);
        console.log(`Written: ${OUT_PNG_256} (${png256.data.length} bytes)`);
    }

    console.log('\nDone! Multi-resolution ICO generated with 16, 32, 48, 256px layers.');
}

generate().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});

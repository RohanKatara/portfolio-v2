import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { faviconSvg } from '../src/data/brand.mjs';

const output = resolve(import.meta.dirname, '../public');
const svg = Buffer.from(faviconSvg);
await writeFile(resolve(output, 'favicon.svg'), svg);
await sharp(svg).resize(32, 32).png().toFile(resolve(output, 'favicon-32.png'));
await sharp(svg).resize(192, 192).png().toFile(resolve(output, 'favicon-192.png'));
await sharp(svg).resize(180, 180).png().toFile(resolve(output, 'apple-touch-icon.png'));

// ICO directory with lossless PNG entries for small browser/Windows sizes.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => sharp(svg).resize(size, size).png().toBuffer()));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(image.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(resolve(output, 'favicon.ico'), Buffer.concat([directory, ...images]));
console.log('Generated SVG, PNG, ICO and Apple touch icons from shared RK geometry.');

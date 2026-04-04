import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(resolve(__dirname, '../public/favicon.svg'))

const sizes = [192, 512]

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(__dirname, `../public/icons/icon-${size}.png`))
  console.log(`Generated icon-${size}.png (${size}x${size})`)
}

// Also generate a 32x32 favicon PNG
await sharp(svg)
  .resize(32, 32)
  .png()
  .toFile(resolve(__dirname, '../public/favicon.png'))
console.log('Generated favicon.png (32x32)')

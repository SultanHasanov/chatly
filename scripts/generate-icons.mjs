// Генерирует PNG-иконки PWA из логотипа прототипа: node scripts/generate-icons.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const logo = (size, padding) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#25D366"/>
  <g transform="translate(${padding} ${padding}) scale(${(size - padding * 2) / 24})">
    <path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.3-3.8A8 8 0 0 1 4 12Z"
      fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
  </g>
</svg>`

// rounded corners для обычной иконки
const rounded = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#25D366"/>
  <g transform="translate(${size * 0.24} ${size * 0.24}) scale(${(size * 0.52) / 24})">
    <path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.3-3.8A8 8 0 0 1 4 12Z"
      fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
  </g>
</svg>`

const targets = [
  ['public/icon-192.png', rounded(192), 192],
  ['public/icon-512.png', rounded(512), 512],
  ['public/apple-touch-icon.png', rounded(180), 180],
  // maskable: логотип в безопасной зоне 80%, фон на всю площадь
  ['public/icon-maskable-512.png', logo(512, 512 * 0.28), 512],
]

await mkdir('public', { recursive: true })
for (const [file, svg, size] of targets) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  await writeFile(file, png)
  console.log('written', file)
}

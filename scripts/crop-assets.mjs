// Crops the single source illustration sheet into individual, enhanced assets.
// Usage: node scripts/crop-assets.mjs  (expects ./source-assets.png at repo root)
//
// Regions are expressed as fractions of the source width/height so they work
// regardless of the exported resolution. Tune in REGIONS if a crop is off.

import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SRC = join(root, 'public', 'assets', 'source-assets.png')
const OUT = join(root, 'public', 'assets')

// [left, top, width, height] as fractions (0..1) of the full sheet.
// Optional `mask`: white rectangles [l,t,w,h] as fractions of the CROP, used
// to paint over stray neighbouring elements caught in the crop.
const REGIONS = {
  hero: { box: [0.035, 0.02, 0.375, 0.55] },
  water: { box: [0.058, 0.6, 0.135, 0.325] },
  plant: { box: [0.225, 0.59, 0.145, 0.34] },
  phone: { box: [0.791, 0.585, 0.185, 0.4] },
  'pill-green': { box: [0.458, 0.365, 0.062, 0.095] },
  'pill-purple': { box: [0.573, 0.365, 0.062, 0.095] },
  'pill-white': { box: [0.672, 0.365, 0.062, 0.095] },
}

async function run() {
  const img = sharp(SRC)
  const meta = await img.metadata()
  const W = meta.width
  const H = meta.height
  console.log(`Source: ${W}x${H}`)

  for (const [name, cfg] of Object.entries(REGIONS)) {
    const [fl, ft, fw, fh] = cfg.box
    const left = Math.round(fl * W)
    const top = Math.round(ft * H)
    const width = Math.round(fw * W)
    const height = Math.round(fh * H)

    // Optional white masks to hide stray neighbouring elements.
    const overlays = (cfg.mask || []).map(([ml, mt, mw, mh]) => {
      const rw = Math.max(1, Math.round(mw * width))
      const rh = Math.max(1, Math.round(mh * height))
      return {
        input: {
          create: { width: rw, height: rh, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
        },
        left: Math.round(ml * width),
        top: Math.round(mt * height),
      }
    })

    let pipe = sharp(SRC).extract({ left, top, width, height })
    if (overlays.length) pipe = sharp(await pipe.png().toBuffer()).composite(overlays)

    await pipe
      .resize({ width: width * 2, height: height * 2, fit: 'fill', kernel: 'lanczos3' }) // upscale for crispness
      .modulate({ saturation: 1.06, brightness: 1.02 }) // subtle enhance
      .sharpen()
      .png({ quality: 95 })
      .toFile(join(OUT, `${name}.png`))

    console.log(`✔ ${name}.png  (${width}x${height} @ ${left},${top})`)
  }
  console.log('Done.')
}

run().catch((e) => {
  console.error(e.message)
  process.exit(1)
})

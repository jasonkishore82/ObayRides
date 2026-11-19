import { curve } from './route.js'

// Static resort layout (world metres). Shared by the 3D sim and the map.
export const LAKE = { x: 0, z: 0, r: 17 }
export const LODGE = { x: 0, z: 66, w: 32, d: 12, h: 6 }
export const POOL = { x: 34, z: 68, w: 14, d: 8 }
export const SPA = { x: 32, z: 0, w: 9, d: 9, h: 3.5 }
export const GAZEBO = { x: -30, z: 2 }
export const VILLAS = [
  [-62, -30], [-68, -4], [-64, 22], [62, -34], [70, -8], [64, 20], [-30, -64], [0, -70], [30, -64],
].map(([x, z], i) => ({ x, z, w: 6, d: 6, h: 3, color: ['#f6efe3', '#fbe9d2', '#e9f1e4'][i % 3] }))

export const BOXES = [LODGE, SPA, ...VILLAS, { x: POOL.x, z: POOL.z, w: POOL.w, d: POOL.d }]

// Samples along the loop, used for distance checks.
export const SAMPLES = Array.from({ length: 240 }, (_, i) => {
  const p = curve.getPointAt(i / 240)
  return [p.x, p.z]
})

export function distToRoad(x, z) {
  let m = Infinity
  for (const [sx, sz] of SAMPLES) m = Math.min(m, Math.hypot(sx - x, sz - z))
  return m
}

function rng(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function blocked(x, z, margin) {
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 6) return true
  if (distToRoad(x, z) < margin) return true
  return BOXES.some((b) => Math.abs(x - b.x) < b.w / 2 + 3 && Math.abs(z - b.z) < b.d / 2 + 3)
}

const r = rng(7)

export const TREES = (() => {
  const out = []
  let guard = 0
  while (out.length < 170 && guard++ < 4000) {
    const x = (r() - 0.5) * 190
    const z = (r() - 0.5) * 190
    if (blocked(x, z, 6.5)) continue
    out.push({ x, z, s: 0.8 + r() * 0.7, type: r() < 0.55 ? 'pine' : 'round' })
  }
  return out
})()

export const FLOWERS = (() => {
  const out = []
  const palette = ['#ff7aa8', '#ffd45e', '#ff9a5a', '#ffffff', '#c58cff']
  for (let i = 0; i < 120; i++) {
    const u = (i + r() * 0.6) / 120
    const p = curve.getPointAt(u)
    const t = curve.getTangentAt(u)
    const side = i % 2 ? 1 : -1
    const off = 4.6 + r() * 1.2
    out.push({ x: p.x - t.z * off * side, z: p.z + t.x * off * side, color: palette[Math.floor(r() * palette.length)] })
  }
  return out.filter((f) => Math.hypot(f.x - LAKE.x, f.z - LAKE.z) > LAKE.r + 4)
})()

export const LAMPS = (() => {
  const out = []
  const n = 24
  for (let i = 0; i < n; i++) {
    const u = i / n
    const p = curve.getPointAt(u)
    const t = curve.getTangentAt(u)
    const side = i % 2 ? 1 : -1
    out.push({ x: p.x - t.z * 3.9 * side, z: p.z + t.x * 3.9 * side })
  }
  return out
})()

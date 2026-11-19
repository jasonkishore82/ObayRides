import * as THREE from 'three'
import { W, H, BUILDINGS, LAKE, KEEPOUT, STOPS } from './sim.js'

// Grid cell (gx, gy) + level → world-space block centre. Ground top is y = 0.
export const wx = (gx) => gx + 0.5 - W / 2
export const wz = (gy) => gy + 0.5 - H / 2

const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const hash3 = (x, y, z) => hash(x + z * 57.3, y - z * 13.1)

function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

const col = (hex, j = 0, h = 0.5) => new THREE.Color(hex).multiplyScalar(1 + (h - 0.5) * j)
const mix = (a, b, t) => a.clone().lerp(b instanceof THREE.Color ? b : new THREE.Color(b), t)

const GRASS = ['#5d8c3c', '#679a43', '#557f36', '#6c9a48']
const BUILD_H = [6, 5, 7, 4, 5, 6]
const WALL = ['#ece6da', '#e7e1d3', '#efe9df', '#e4ddcf', '#ebe5d8', '#e9e3d6']
const ROOF = ['#9b4a32', '#56626f', '#9b4a32', '#7d5638', '#56626f', '#8f4630']

const inRect = (x, y, [rx, ry, rw, rh]) => x >= rx && x < rx + rw && y >= ry && y < ry + rh

export function buildWorld(sim) {
  const ground = []
  const sets = { wall: [], glass: [], roof: [], wood: [], trunk: [], leaves: [], hedge: [], sand: [], water: [], post: [], lampPost: [], lamp: [], flower: [], tuft: [], stone: [] }
  const block = (set, gx, lv, gy, c, s) => sets[set].push({ p: [wx(gx), lv + 0.5, wz(gy)], c, s })

  // ground
  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx < W; gx++) {
      const i = gy * W + gx
      const dl = Math.hypot(gx + 0.5 - LAKE.x, gy + 0.5 - LAKE.y)
      if (dl < LAKE.r) {
        sets.water.push({ p: [wx(gx), -0.6, wz(gy)], c: col('#3d8fb5', 0.12, hash(gx, gy)), s: [1, 0.8, 1] })
        sets.sand.push({ p: [wx(gx), -1.5, wz(gy)], c: col('#cdb98a', 0.2, hash(gy, gx)) })
        continue
      }
      if (BUILDINGS.some((b) => inRect(gx, gy, b))) continue
      const h = hash(gx, gy)
      let c
      if (sim.walk[i] === 2) c = col((gx + gy) % 2 ? '#d3ccbf' : '#cbc3b5', 0.08, h)
      else if (sim.walk[i]) c = col('#bdb3a1', 0.16, h)
      else if (dl < LAKE.r + 1.6) c = col('#d6c595', 0.12, h)
      else {
        const n = noise(gx * 0.15, gy * 0.15)
        c = col(GRASS[Math.floor(h * GRASS.length)], 0.18, n)
      }
      ground.push({ gx, gy, i, base: c })

      // ground details on lawn
      if (!sim.walk[i] && !sim.occ[i] && dl > LAKE.r + 2) {
        const r = hash(gy * 3.1, gx * 1.7)
        const ox = (hash(gx, gy * 2) - 0.5) * 0.6
        const oz = (hash(gx * 2, gy) - 0.5) * 0.6
        if (r > 0.94) {
          const fc = ['#f25c78', '#ffd45e', '#ffffff', '#b98cff', '#ff9a4a'][Math.floor(hash(gx * 5, gy) * 5)]
          sets.flower.push({ p: [wx(gx) + ox, 0.14, wz(gy) + oz], c: col(fc), s: [0.22, 0.22, 0.22] })
          sets.tuft.push({ p: [wx(gx) + ox, 0.05, wz(gy) + oz], c: col('#4f7f31'), s: [0.1, 0.1, 0.1] })
        } else if (r > 0.78) {
          sets.tuft.push({ p: [wx(gx) + ox, 0.15, wz(gy) + oz], c: col('#6fa447', 0.25, r), s: [0.12, 0.3, 0.12] })
        }
      }
    }
  }

  // hedge border
  for (let gx = 0; gx < W; gx++) for (const gy of [0, H - 1]) block('hedge', gx, 0, gy, col('#2f5e2a', 0.2, hash(gx, gy)))
  for (let gy = 1; gy < H - 1; gy++) for (const gx of [0, W - 1]) block('hedge', gx, 0, gy, col('#2f5e2a', 0.2, hash(gx, gy)))

  // buildings
  BUILDINGS.forEach(([bx, by, bw, bh], k) => {
    const hgt = BUILD_H[k]
    for (let gx = bx; gx < bx + bw; gx++) {
      for (let gy = by; gy < by + bh; gy++) {
        const edgeX = gx === bx || gx === bx + bw - 1
        const edgeY = gy === by || gy === by + bh - 1
        if (!edgeX && !edgeY) continue
        const corner = edgeX && edgeY
        const along = edgeY ? gx - bx : gy - by
        for (let lv = 0; lv < hgt; lv++) {
          const door = gy === by + bh - 1 && gx === bx + Math.floor(bw / 2) && lv < 2
          if (door) { block('wood', gx, lv, gy, col('#6b4a2f', 0.1, hash(lv, gx))); continue }
          if (corner || lv === 0 || lv === hgt - 1) { block('wall', gx, lv, gy, col(corner ? '#d8d1c3' : WALL[k], 0.06, hash3(gx, gy, lv))); continue }
          if (lv % 2 === 1 && along % 2 === 1) block('glass', gx, lv, gy, col('#9cc7e0', 0.1, hash3(gx, lv, gy)))
          else block('wall', gx, lv, gy, col(WALL[k], 0.06, hash3(gx, gy, lv)))
        }
      }
    }
    // stepped hip roof with a 1-block overhang
    for (let r = 0; r < 4; r++) {
      const x0 = bx - 1 + r, x1 = bx + bw - r, y0 = by - 1 + r, y1 = by + bh - r
      if (x0 > x1 || y0 > y1) break
      const top = r === 3 || x0 + 1 >= x1 - 1 || y0 + 1 >= y1 - 1
      for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
        if (!top && gx !== x0 && gx !== x1 && gy !== y0 && gy !== y1) continue
        block('roof', gx, hgt + r, gy, col(ROOF[k], 0.12, hash3(gx, gy, r)))
      }
      if (top) break
    }
  })

  // trees
  for (const t of sim.trees) {
    for (let lv = 0; lv < t.h; lv++) block('trunk', t.x, lv, t.y, col('#5a3d26', 0.15, hash(lv, t.x)))
    for (let lv = t.h - 1; lv <= t.h + 2; lv++) {
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0 && lv < t.h) continue
        const d = Math.hypot(dx, (lv - t.h - 0.3) * 1.25, dy)
        if (d > t.r || hash3(t.x + dx, t.y + dy, lv) < 0.1) continue
        const shade = 0.82 + (lv - t.h + 1) * 0.07
        block('leaves', t.x + dx, lv, t.y + dy, col(['#3f7d2e', '#4a8a34', '#376f28'][Math.floor(hash3(dx, dy, lv + t.x) * 3)], 0.2, hash3(t.y, dx, dy)).multiplyScalar(shade))
      }
    }
  }

  // keepout barrier posts
  const [kx, ky, kw, kh] = KEEPOUT
  let n = 0
  for (let gx = kx; gx < kx + kw; gx++) for (let gy = ky; gy < ky + kh; gy++) {
    const edge = gx === kx || gx === kx + kw - 1 || gy === ky || gy === ky + kh - 1
    if (!edge || (gx + gy) % 2) continue
    sets.post.push({ p: [wx(gx), 0.6, wz(gy)], c: col(n++ % 2 ? '#f4f4f4' : '#e82127'), s: [0.22, 1.2, 0.22] })
  }

  // stops: lamp posts and a marker pillar
  for (const s of STOPS) {
    for (const [dx, dy] of [[-3, -3], [3, 3]]) {
      const gx = s.x + dx, gy = s.y + dy
      if (gx < 1 || gy < 1 || gx >= W - 1 || gy >= H - 1 || sim.occ[gy * W + gx]) continue
      sets.lampPost.push({ p: [wx(gx), 1.4, wz(gy)], c: col('#2d3036'), s: [0.16, 2.8, 0.16] })
      sets.lamp.push({ p: [wx(gx), 2.95, wz(gy)], c: col('#fff1c9'), s: [0.4, 0.3, 0.4] })
    }
    sets.stone.push({ p: [wx(s.x), 0.5, wz(s.y)], c: col('#e9e6df'), s: [0.6, 1, 0.6] })
  }

  // surrounding terrain (outside the mapped site)
  const terrain = []
  for (let gy = -32; gy < H + 32; gy++) {
    for (let gx = -40; gx < W + 40; gx++) {
      if (gx >= 0 && gy >= 0 && gx < W && gy < H) continue
      const e = Math.max(-gx, gx - (W - 1), -gy, gy - (H - 1))
      const nn = noise(gx * 0.07, gy * 0.07)
      const n2 = noise(gx * 0.2 + 40, gy * 0.2)
      const h = Math.min(20, Math.max(1, Math.round(0.4 + e * 0.16 + nn * e * 0.24 + n2 * 2.5)))
      let c
      if (h < 5) c = col(GRASS[Math.floor(hash(gx, gy) * 4)], 0.2, n2)
      else if (h < 9) c = mix(col('#5a7a3a', 0.2, n2), '#7a7457', (h - 5) / 5)
      else if (h < 14) c = col('#8b8780', 0.2, hash(gx, gy))
      else c = col('#eef1f3', 0.05, hash(gx, gy))
      terrain.push({ p: [wx(gx), h / 2 - 1, wz(gy)], c, s: [1, h, 1] })
    }
  }

  return { ground, sets, terrain }
}

// 16×16 grey noise texture: gives every block a faint pixel grain.
export function makeGrain() {
  const size = 16
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const v = 214 + Math.floor(hash(i % size, Math.floor(i / size)) * 41)
    data.set([v, v, v, 255], i * 4)
  }
  const tex = new THREE.DataTexture(data, size, size)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// A small, self-contained imitation of the Nav2 pipeline, for illustration.
// Grid units are cells; RES metres per cell. y grows downward (screen space).

export const W = 96
export const H = 60
export const RES = 1
export const VMAX = 4 // cells/s = 14.4 km/h at RES 1

export const STOPS = [
  { name: 'Main Gate', x: 8, y: 52 },
  { name: 'Lake Villas', x: 86, y: 50 },
  { name: 'Spa', x: 84, y: 9 },
  { name: 'Gardens', x: 12, y: 8 },
]
export const BUILDINGS = [
  [22, 40, 12, 8], [40, 6, 14, 8], [62, 36, 10, 12], [70, 4, 8, 6], [4, 24, 8, 8], [84, 24, 8, 10],
]
export const LAKE = { x: 46, y: 30, r: 9 }
export const KEEPOUT = [26, 18, 10, 8]
export const SPEEDZONE = [56, 44, 22, 14]
const PED_PATHS = [
  [[14, 55], [34, 55]], [[60, 20], [76, 20]], [[80, 40], [80, 57]], [[19, 14], [19, 34]], [[40, 52], [54, 52]],
]

const idx = (x, y) => y * W + x
const inRect = (x, y, [rx, ry, rw, rh]) => x >= rx && x < rx + rw && y >= ry && y < ry + rh
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t))
}

function buildStatic() {
  const occ = new Uint8Array(W * H)
  const keep = new Uint8Array(W * H)
  const speed = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y)
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) occ[i] = 1
      if (BUILDINGS.some((b) => inRect(x, y, b))) occ[i] = 1
      if (Math.hypot(x + 0.5 - LAKE.x, y + 0.5 - LAKE.y) < LAKE.r) occ[i] = 1
      if (inRect(x, y, KEEPOUT)) keep[i] = 1
      if (inRect(x, y, SPEEDZONE)) speed[i] = 1
    }
  }
  let cost = distanceCost(occ)

  // walkways: the routes the planner takes between consecutive stops, plus plazas at stops
  const walk = new Uint8Array(W * H)
  const pc0 = new Uint8Array(cost)
  for (let i = 0; i < W * H; i++) if (keep[i]) pc0[i] = 254
  for (let k = 0; k < STOPS.length; k++) {
    const a = STOPS[k], b = STOPS[(k + 1) % STOPS.length]
    const { path } = astar(pc0, a.x, a.y, b.x, b.y)
    for (const [px, py] of path ?? []) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = Math.floor(px) + dx, ny = Math.floor(py) + dy
        if (nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && !occ[idx(nx, ny)]) walk[idx(nx, ny)] = 1
      }
    }
  }
  for (const s of STOPS) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const nx = s.x + dx, ny = s.y + dy
      if (Math.hypot(dx, dy) <= 3.2 && nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && !occ[idx(nx, ny)]) walk[idx(nx, ny)] = 2
    }
  }

  // trees: away from walkways, stops and pedestrian paths; they become real obstacles
  const rnd = mulberry(11)
  const trees = []
  for (let t = 0; t < 5000 && trees.length < 48; t++) {
    const x = 2 + Math.floor(rnd() * (W - 4))
    const y = 2 + Math.floor(rnd() * (H - 4))
    const i = idx(x, y)
    if (occ[i] || keep[i] || speed[i] || cost[i] >= 200) continue
    let near = false
    for (let dy = -4; dy <= 4 && !near; dy++) for (let dx = -4; dx <= 4; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && walk[idx(nx, ny)]) { near = true; break }
    }
    if (near) continue
    if (STOPS.some((s) => Math.hypot(s.x - x, s.y - y) < 7)) continue
    if (PED_PATHS.some(([a, b]) => segDist(x + 0.5, y + 0.5, a, b) < 2.5)) continue
    if (trees.some((o) => Math.hypot(o.x - x, o.y - y) < 3.2)) continue
    trees.push({ x, y, h: 3 + Math.floor(rnd() * 2), r: 1.6 + rnd() * 0.8 })
  }
  for (const t of trees) occ[idx(t.x, t.y)] = 1
  cost = distanceCost(occ)

  return { occ, keep, speed, cost, walk, trees }
}

function distanceCost(occ) {
  // chamfer distance transform -> inflation
  const d = new Float32Array(W * H).fill(1e9)
  for (let i = 0; i < W * H; i++) if (occ[i]) d[i] = 0
  const relax = (x, y, nx, ny, w) => {
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return
    const v = d[idx(nx, ny)] + w
    if (v < d[idx(x, y)]) d[idx(x, y)] = v
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    relax(x, y, x - 1, y, 1); relax(x, y, x, y - 1, 1); relax(x, y, x - 1, y - 1, 1.414); relax(x, y, x + 1, y - 1, 1.414)
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    relax(x, y, x + 1, y, 1); relax(x, y, x, y + 1, 1); relax(x, y, x + 1, y + 1, 1.414); relax(x, y, x - 1, y + 1, 1.414)
  }
  const cost = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const v = d[i]
    cost[i] = v === 0 ? 254 : v <= 1.5 ? 253 : v < 7 ? Math.round(200 * Math.exp(-0.7 * (v - 1.5))) : 0
  }
  return cost
}

// ---------- A* (Smac 2D-like, cost-aware) ----------
function astar(pc, sx, sy, gx, gy) {
  const N = W * H
  const g = new Float32Array(N).fill(Infinity)
  const came = new Int32Array(N).fill(-1)
  const closed = new Uint8Array(N)
  const hk = []
  const hv = []
  const push = (k, v) => {
    hk.push(k); hv.push(v)
    let i = hk.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (hk[p] <= hk[i]) break
      ;[hk[p], hk[i]] = [hk[i], hk[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]
      i = p
    }
  }
  const pop = () => {
    const v = hv[0]
    const lk = hk.pop(); const lv = hv.pop()
    if (hk.length) {
      hk[0] = lk; hv[0] = lv
      let i = 0
      for (;;) {
        const l = 2 * i + 1, r = l + 1
        let m = i
        if (l < hk.length && hk[l] < hk[m]) m = l
        if (r < hk.length && hk[r] < hk[m]) m = r
        if (m === i) break
        ;[hk[m], hk[i]] = [hk[i], hk[m]]; [hv[m], hv[i]] = [hv[i], hv[m]]
        i = m
      }
    }
    return v
  }
  const hcost = (i) => Math.hypot((i % W) - gx, ((i / W) | 0) - gy)
  const s = idx(sx, sy)
  const goal = idx(gx, gy)
  g[s] = 0
  push(hcost(s), s)
  let expanded = 0
  while (hk.length) {
    const i = pop()
    if (closed[i]) continue
    closed[i] = 1
    expanded++
    if (i === goal) break
    const x = i % W, y = (i / W) | 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const ni = idx(nx, ny)
      if (closed[ni] || pc[ni] >= 253) continue
      const ng = g[i] + (dx && dy ? 1.414 : 1) * (1 + pc[ni] / 50)
      if (ng < g[ni]) { g[ni] = ng; came[ni] = i; push(ng + hcost(ni), ni) }
    }
  }
  if (came[goal] === -1 && goal !== s) return { path: null, expanded }
  const path = []
  for (let c = goal; c !== -1; c = came[c]) path.push([(c % W) + 0.5, ((c / W) | 0) + 0.5])
  return { path: path.reverse(), expanded }
}

function smooth(p) {
  const q = p.map((a) => [...a])
  for (let it = 0; it < 60; it++) {
    for (let i = 1; i < q.length - 1; i++) {
      for (let d = 0; d < 2; d++) {
        q[i][d] += 0.1 * (p[i][d] - q[i][d]) + 0.3 * (q[i - 1][d] + q[i + 1][d] - 2 * q[i][d])
      }
    }
  }
  return q
}

// ---------- sim ----------
export function createSim() {
  const st = buildStatic()
  return {
    ...st,
    x: STOPS[0].x, y: STOPS[0].y, th: 0, v: 0, k: 0,
    goal: null, goals: [], loop: true, loopIdx: 1,
    raw: [], path: [], pathIdx: 0, look: null,
    peds: PED_PATHS.map(([a, b], i) => ({ a, b, s: (i * 0.37) % 1, dir: 1, x: a[0], y: a[1] })),
    obs: new Float32Array(W * H), hits: [],
    monitor: 'clear', behavior: null, blockedT: 0, dwell: 0, inSpeedZone: false,
    replanT: 0, needPlan: true, planMs: 0, expanded: 0, planFlash: -9,
    log: [], time: 0,
  }
}

function log(sim, msg, kind = 'info') {
  sim.log.unshift({ t: sim.time, msg, kind })
  if (sim.log.length > 40) sim.log.pop()
}

export function setGoal(sim, x, y, name = 'Custom goal') {
  if (!isFree(sim, x, y)) return false
  sim.goals = []
  sim.loop = false
  sim.goal = { x, y, name }
  sim.needPlan = true
  sim.dwell = 0
  log(sim, `NavigateToPose → ${name}`, 'bt')
  return true
}

export function addWaypoint(sim, x, y) {
  if (!isFree(sim, x, y)) return false
  sim.loop = false
  sim.goals.push({ x, y, name: `Waypoint ${sim.goals.length + 1}` })
  log(sim, `Waypoint queued (${sim.goals.length})`, 'bt')
  return true
}

export function setPatrol(sim, on) {
  sim.loop = on
  if (on) { sim.goals = []; log(sim, 'FollowWaypoints: patrol resort stops', 'bt') }
}

function isFree(sim, x, y) {
  const cx = Math.floor(x), cy = Math.floor(y)
  if (cx < 0 || cy < 0 || cx >= W || cy >= H) return false
  const i = idx(cx, cy)
  return sim.cost[i] < 253 && !sim.keep[i]
}

function plan(sim, reason) {
  const t0 = performance.now()
  const pc = new Uint8Array(sim.cost)
  for (let i = 0; i < W * H; i++) if (sim.keep[i]) pc[i] = 254
  for (let i = 0; i < W * H; i++) {
    if (sim.obs[i] <= 0) continue
    const cx = i % W, cy = (i / W) | 0
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const d = Math.hypot(dx, dy)
      const j = idx(nx, ny)
      if (d <= 1.5) pc[j] = 254
      else if (d <= 3) pc[j] = Math.max(pc[j], 170)
    }
  }
  const sx = clamp(Math.floor(sim.x), 0, W - 1), sy = clamp(Math.floor(sim.y), 0, H - 1)
  pc[idx(sx, sy)] = 0
  const g = sim.goal
  const { path, expanded } = astar(pc, sx, sy, Math.floor(g.x), Math.floor(g.y))
  sim.planMs = performance.now() - t0
  sim.expanded = expanded
  sim.planFlash = sim.time
  if (!path) {
    if (reason) log(sim, 'ComputePathToPose ✗ no path, keeping previous', 'warn')
    return
  }
  sim.raw = path
  sim.path = smooth(path)
  sim.pathIdx = 0
  if (reason) log(sim, `ComputePathToPose ✓ ${sim.planMs.toFixed(1)} ms · ${reason}`, 'plan')
}

export function step(sim, dt) {
  sim.time += dt

  // pedestrians
  for (const p of sim.peds) {
    const len = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1])
    p.s += (p.dir * 1.1 * dt) / len
    if (p.s > 1) { p.s = 1; p.dir = -1 }
    if (p.s < 0) { p.s = 0; p.dir = 1 }
    p.x = p.a[0] + (p.b[0] - p.a[0]) * p.s
    p.y = p.a[1] + (p.b[1] - p.a[1]) * p.s
  }

  // lidar → obstacle layer
  for (let i = 0; i < W * H; i++) if (sim.obs[i] > 0) sim.obs[i] -= dt
  const hits = []
  for (let r = 0; r < 140; r++) {
    const a = sim.th + (r / 140) * Math.PI * 2
    const ca = Math.cos(a), sa = Math.sin(a)
    for (let d = 0.6; d < 14; d += 0.3) {
      const px = sim.x + ca * d, py = sim.y + sa * d
      const cx = Math.floor(px), cy = Math.floor(py)
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) break
      if (sim.occ[idx(cx, cy)]) { hits.push([px, py, 0]); break }
      let ped = false
      for (const p of sim.peds) if ((px - p.x) ** 2 + (py - p.y) ** 2 < 0.3) { ped = true; break }
      if (ped) { hits.push([px, py, 1]); sim.obs[idx(cx, cy)] = 2.5; break }
    }
  }
  sim.hits = hits

  // goals
  if (!sim.goal) {
    if (sim.goals.length) {
      sim.goal = sim.goals.shift()
      log(sim, `NavigateThroughPoses → ${sim.goal.name}`, 'bt')
      sim.needPlan = true
    } else if (sim.loop) {
      const s = STOPS[sim.loopIdx]
      sim.loopIdx = (sim.loopIdx + 1) % STOPS.length
      sim.goal = { ...s, stop: true }
      log(sim, `NavigateToPose → ${s.name}`, 'bt')
      sim.needPlan = true
    }
  }

  // planning (1 Hz replanning, like a RateController node)
  sim.replanT -= dt
  if (sim.goal && (sim.needPlan || sim.replanT <= 0)) {
    plan(sim, sim.needPlan ? 'new goal' : null)
    sim.needPlan = false
    sim.replanT = 1
  }

  // control (Regulated Pure Pursuit-like)
  let vt = 0
  let k = 0
  sim.monitor = 'clear'
  const cell = idx(clamp(Math.floor(sim.x), 0, W - 1), clamp(Math.floor(sim.y), 0, H - 1))
  sim.inSpeedZone = !!sim.speed[cell]
  sim.look = null

  if (sim.dwell > 0) {
    sim.dwell -= dt
    if (sim.dwell <= 0) log(sim, 'Passengers seated · departing', 'info')
  } else if (sim.goal && sim.path.length > 1) {
    const P = sim.path
    let best = sim.pathIdx, bd = Infinity
    for (let i = sim.pathIdx; i < Math.min(P.length, sim.pathIdx + 30); i++) {
      const d = Math.hypot(P[i][0] - sim.x, P[i][1] - sim.y)
      if (d < bd) { bd = d; best = i }
    }
    sim.pathIdx = best
    const L = clamp(1.6 + Math.abs(sim.v) * 0.8, 2, 5)
    let tgt = P[P.length - 1]
    for (let i = best; i < P.length; i++) {
      if (Math.hypot(P[i][0] - sim.x, P[i][1] - sim.y) >= L) { tgt = P[i]; break }
    }
    sim.look = tgt
    const alpha = wrap(Math.atan2(tgt[1] - sim.y, tgt[0] - sim.x) - sim.th)
    k = clamp((2 * Math.sin(alpha)) / L, -0.5, 0.5) // Ackermann: min turn radius 2 cells
    vt = VMAX / (1 + 2.2 * Math.abs(k))
    if (sim.cost[cell] > 60) vt *= 0.6
    if (sim.inSpeedZone) vt = Math.min(vt, VMAX * 0.4)
    const dg = Math.hypot(sim.goal.x - sim.x, sim.goal.y - sim.y)
    if (dg < 5) vt = Math.min(vt, 0.6 + dg * 0.5)

    // collision monitor: polygons in robot frame
    const c = Math.cos(sim.th), s = Math.sin(sim.th)
    for (const p of sim.peds) {
      const dx = p.x - sim.x, dy = p.y - sim.y
      const lx = dx * c + dy * s, ly = -dx * s + dy * c
      if (lx > 0 && lx < 3.4 && Math.abs(ly) < 1.5) sim.monitor = 'stop'
      else if (lx > 0 && lx < 7.5 && Math.abs(ly) < 2.4 && sim.monitor !== 'stop') sim.monitor = 'slow'
    }
    if (sim.monitor === 'stop') vt = 0
    if (sim.monitor === 'slow') vt = Math.min(vt, VMAX * 0.35)

    // recovery
    if (sim.monitor === 'stop' && !sim.behavior) {
      sim.blockedT += dt
      if (sim.blockedT > 2) {
        sim.behavior = { name: 'Wait', t: 1.5 }
        sim.blockedT = 0
        log(sim, 'Collision monitor STOP · recovery: Wait 1.5 s', 'warn')
      }
    } else if (sim.monitor !== 'stop') sim.blockedT = 0

    if (dg < 1.6) {
      log(sim, `Goal reached: ${sim.goal.name}`, 'ok')
      if (sim.goal.stop) { sim.dwell = 2; log(sim, 'Passenger stop · dwell 2 s', 'info') }
      sim.goal = null
      sim.path = []
      sim.raw = []
      vt = 0
    }
  }

  if (sim.behavior) {
    sim.behavior.t -= dt
    vt = 0
    if (sim.behavior.t <= 0) {
      sim.behavior = null
      if (sim.goal) { plan(sim, 'replan around obstacle'); sim.replanT = 1 }
    }
  }

  // velocity smoother (accel / decel limits)
  const acc = vt > sim.v ? 2 : 5
  sim.v += clamp(vt - sim.v, -acc * dt, acc * dt)
  sim.k = k
  sim.x += sim.v * Math.cos(sim.th) * dt
  sim.y += sim.v * Math.sin(sim.th) * dt
  sim.th = wrap(sim.th + sim.v * k * dt)
}

export function status(sim) {
  const planning = sim.time - sim.planFlash < 0.35
  return {
    kmh: Math.abs(sim.v) * RES * 3.6,
    goal: sim.goal?.name ?? (sim.dwell > 0 ? 'Passenger stop' : 'Idle'),
    dist: sim.goal ? Math.hypot(sim.goal.x - sim.x, sim.goal.y - sim.y) * RES : 0,
    queue: sim.goals.length,
    loop: sim.loop,
    monitor: sim.monitor,
    planMs: sim.planMs,
    expanded: sim.expanded,
    servers: [
      ['bt_navigator', sim.goal ? 'NavigateToPose' : 'idle', sim.goal ? 'on' : 'idle'],
      ['planner_server', planning ? 'computing' : 'Smac 2D', planning ? 'busy' : 'on'],
      ['smoother_server', planning ? 'smoothing' : 'ready', planning ? 'busy' : 'on'],
      ['controller_server', Math.abs(sim.v) > 0.05 ? 'FollowPath · RPP' : 'holding', Math.abs(sim.v) > 0.05 ? 'busy' : 'on'],
      ['velocity_smoother', `${(Math.abs(sim.v) * RES).toFixed(1)} m/s`, 'on'],
      ['collision_monitor', sim.monitor, sim.monitor === 'stop' ? 'stop' : sim.monitor === 'slow' ? 'warn' : 'on'],
      ['behavior_server', sim.behavior ? sim.behavior.name : 'idle', sim.behavior ? 'warn' : 'idle'],
      ['waypoint_follower', sim.loop ? 'patrol' : sim.goals.length ? `${sim.goals.length} queued` : 'idle', sim.loop || sim.goals.length ? 'on' : 'idle'],
      ['costmap filters', sim.inSpeedZone ? 'speed limit 40%' : 'keepout · speed', sim.inSpeedZone ? 'warn' : 'on'],
      ['map_server', 'resort.yaml', 'on'],
      ['amcl', 'localized', 'on'],
      ['lifecycle_manager', 'all active', 'on'],
    ],
  }
}

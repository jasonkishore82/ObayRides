import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  createSim, step, status, setGoal, addWaypoint, setPatrol,
  W, H, RES, STOPS, BUILDINGS, LAKE, KEEPOUT, SPEEDZONE,
} from './sim.js'
import { connectRos } from './ros.js'

const Live3D = lazy(() => import('./Live3D.jsx'))
const CAMS = [['chase', 'Chase'], ['orbit', 'Orbit'], ['top', 'Top']]

const C = {
  bg: '#f2f2f2', building: '#d0d1d2', lake: '#d6e4f0', ink: '#171a20', grey: '#5c5e62',
  blue: '#3e6ae1', red: '#e82127', amber: '#c9862b',
}

const LAYERS = [
  ['inflation', 'Costmap · inflation'],
  ['filters', 'Keepout & speed filters'],
  ['lidar', 'LiDAR scan'],
  ['obstacles', 'Obstacle layer'],
  ['global', 'Global plan'],
  ['local', 'Local controller'],
  ['monitor', 'Collision monitor'],
  ['waypoints', 'Waypoints'],
]

function hatch(ctx, x, y, w, h, color, gap = 6) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  for (let i = -h; i < w; i += gap) {
    ctx.beginPath()
    ctx.moveTo(x + i, y + h)
    ctx.lineTo(x + i + h, y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawStatic(ctx, sim, v, layers) {
  const { s, ox, oy } = v
  ctx.fillStyle = C.bg
  ctx.fillRect(ox, oy, W * s, H * s)
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < W * H; i++) {
    if (sim.walk[i]) ctx.fillRect(ox + (i % W) * s, oy + ((i / W) | 0) * s, s + 0.5, s + 0.5)
  }
  if (layers.inflation) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = sim.cost[y * W + x]
      if (c === 0 || sim.occ[y * W + x]) continue
      ctx.fillStyle = `rgba(62,106,225,${c >= 253 ? 0.32 : (c / 253) * 0.24})`
      ctx.fillRect(ox + x * s, oy + y * s, s + 0.5, s + 0.5)
    }
  }
  ctx.fillStyle = C.building
  for (const [x, y, w, h] of BUILDINGS) {
    ctx.beginPath()
    ctx.roundRect(ox + x * s, oy + y * s, w * s, h * s, s * 0.6)
    ctx.fill()
  }
  ctx.fillStyle = '#c9d6c5'
  for (const t of sim.trees) {
    ctx.beginPath()
    ctx.arc(ox + (t.x + 0.5) * s, oy + (t.y + 0.5) * s, s * 0.9, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = C.lake
  ctx.beginPath()
  ctx.arc(ox + LAKE.x * s, oy + LAKE.y * s, LAKE.r * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = C.building
  ctx.lineWidth = s * 0.5
  ctx.strokeRect(ox + s * 0.25, oy + s * 0.25, (W - 0.5) * s, (H - 0.5) * s)

  if (layers.filters) {
    const [kx, ky, kw, kh] = KEEPOUT
    ctx.fillStyle = 'rgba(232,33,39,0.06)'
    ctx.fillRect(ox + kx * s, oy + ky * s, kw * s, kh * s)
    hatch(ctx, ox + kx * s, oy + ky * s, kw * s, kh * s, 'rgba(232,33,39,0.35)')
    const [zx, zy, zw, zh] = SPEEDZONE
    hatch(ctx, ox + zx * s, oy + zy * s, zw * s, zh * s, 'rgba(92,94,98,0.18)', 8)
    ctx.font = `600 ${Math.max(9, s * 0.95)}px system-ui`
    ctx.fillStyle = C.red
    ctx.fillText('KEEPOUT', ox + kx * s + 4, oy + ky * s - 4)
    ctx.fillStyle = C.grey
    ctx.fillText('SPEED LIMIT 40%', ox + zx * s + 4, oy + (zy + zh) * s - 6)
  }

  ctx.font = `500 ${Math.max(10, s * 1.05)}px system-ui`
  for (const st of STOPS) {
    const px = ox + st.x * s, py = oy + st.y * s
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(px, py, s * 0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = C.grey
    const right = st.x < W - 14
    ctx.textAlign = right ? 'left' : 'right'
    ctx.fillText(st.name, px + (right ? s * 1.4 : -s * 1.4), py + 4)
  }
  ctx.textAlign = 'left'
}

function drawCar(ctx, px, py, th, s, color = C.ink) {
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(th)
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 8
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(-s * 1.2, -s * 0.7, s * 2.4, s * 1.4, s * 0.45)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(s * 0.9, 0)
  ctx.lineTo(s * 0.25, -s * 0.38)
  ctx.lineTo(s * 0.25, s * 0.38)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function polyline(ctx, pts, v, toPx) {
  ctx.beginPath()
  pts.forEach((p, i) => {
    const [x, y] = toPx(p)
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  })
}

function drawDynamic(ctx, sim, v, layers) {
  const { s, ox, oy } = v
  const toPx = ([x, y]) => [ox + x * s, oy + y * s]

  if (layers.obstacles) {
    for (let i = 0; i < W * H; i++) {
      const t = sim.obs[i]
      if (t <= 0) continue
      ctx.fillStyle = `rgba(23,26,32,${Math.min(0.55, t * 0.22)})`
      ctx.fillRect(ox + (i % W) * s, oy + ((i / W) | 0) * s, s, s)
    }
  }

  if (layers.global && sim.raw.length) {
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = 'rgba(92,94,98,0.55)'
    ctx.lineWidth = 1.2
    polyline(ctx, sim.raw, v, toPx)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = C.blue
    ctx.lineWidth = Math.max(3, s * 0.4)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    polyline(ctx, sim.path.slice(sim.pathIdx), v, toPx)
    ctx.stroke()
  }

  if (layers.waypoints) {
    const all = [sim.goal, ...sim.goals].filter(Boolean)
    all.forEach((g, i) => {
      const [px, py] = toPx([g.x, g.y])
      ctx.fillStyle = i === 0 ? C.blue : C.ink
      ctx.beginPath()
      ctx.arc(px, py, s * 0.9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${Math.max(9, s * 0.95)}px system-ui`
      ctx.textAlign = 'center'
      ctx.fillText(i === 0 ? '●' : String(i), px, py + s * 0.35)
      ctx.textAlign = 'left'
    })
  }

  if (layers.lidar) {
    for (const [x, y, ped] of sim.hits) {
      ctx.fillStyle = ped ? C.red : 'rgba(232,33,39,0.45)'
      const r = ped ? 2.4 : 1.5
      ctx.fillRect(ox + x * s - r / 2, oy + y * s - r / 2, r, r)
    }
  }

  for (const p of sim.peds) {
    const [px, py] = toPx([p.x, p.y])
    ctx.fillStyle = C.grey
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(px, py, s * 0.55, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  const [rx, ry] = toPx([sim.x, sim.y])

  if (layers.monitor) {
    ctx.save()
    ctx.translate(rx, ry)
    ctx.rotate(sim.th)
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = sim.monitor === 'slow' ? C.amber : 'rgba(92,94,98,0.6)'
    if (sim.monitor === 'slow') { ctx.fillStyle = 'rgba(201,134,43,0.12)'; ctx.fillRect(0, -2.4 * s, 7.5 * s, 4.8 * s) }
    ctx.strokeRect(0, -2.4 * s, 7.5 * s, 4.8 * s)
    ctx.setLineDash([])
    ctx.strokeStyle = C.red
    if (sim.monitor === 'stop') { ctx.fillStyle = 'rgba(232,33,39,0.2)'; ctx.fillRect(0, -1.5 * s, 3.4 * s, 3 * s) }
    ctx.strokeRect(0, -1.5 * s, 3.4 * s, 3 * s)
    ctx.restore()
  }

  if (layers.local && sim.look) {
    // predicted arc for the current command
    const pts = []
    let x = sim.x, y = sim.y, th = sim.th
    const v0 = Math.max(Math.abs(sim.v), 1.2)
    for (let i = 0; i < 24; i++) {
      pts.push([x, y])
      x += v0 * Math.cos(th) * 0.08
      y += v0 * Math.sin(th) * 0.08
      th += v0 * sim.k * 0.08
    }
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 2
    polyline(ctx, pts, v, toPx)
    ctx.stroke()
    const [lx, ly] = toPx(sim.look)
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(lx, ly, s * 0.6, 0, Math.PI * 2)
    ctx.stroke()
  }

  drawCar(ctx, rx, ry, sim.th, s)
}

function drawRos(ctx, v, ros) {
  const { s, ox, oy } = v
  const toPx = ([x, y]) => [ox + (x / RES) * s, oy + (H - y / RES) * s]
  if (ros.plan.length) {
    ctx.strokeStyle = C.blue
    ctx.lineWidth = 3
    polyline(ctx, ros.plan, v, toPx)
    ctx.stroke()
  }
  if (ros.pose) {
    const [px, py] = toPx([ros.pose.x, ros.pose.y])
    drawCar(ctx, px, py, -ros.pose.yaw, s, C.blue)
  }
}

export default function Live() {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const sim = useRef(null)
  if (!sim.current) sim.current = createSim()
  const [layers, setLayers] = useState(() => Object.fromEntries(LAYERS.map(([k]) => [k, true])))
  const layersRef = useRef(layers)
  layersRef.current = layers
  const [hud, setHud] = useState(() => status(sim.current))
  const [log, setLog] = useState([])
  const [wpMode, setWpMode] = useState(false)
  const [rosUrl, setRosUrl] = useState('ws://localhost:9090')
  const [rosState, setRosState] = useState('off')
  const ros = useRef({ conn: null, pose: null, plan: [] })
  const view = useRef({ s: 8, ox: 0, oy: 0 })
  const [mode3d, setMode3d] = useState(true)
  const [cam, setCam] = useState('chase')
  const mode3dRef = useRef(mode3d)
  mode3dRef.current = mode3d

  useEffect(() => {
    const cv = canvas.current
    const ctx = cv.getContext('2d')
    const resize = () => {
      const r = wrap.current.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      cv.width = r.width * dpr
      cv.height = r.height * dpr
      cv.style.width = r.width + 'px'
      cv.style.height = r.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const s = Math.min(r.width / W, r.height / H)
      view.current = { s, ox: (r.width - W * s) / 2, oy: (r.height - H * s) / 2, w: r.width, h: r.height }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap.current)

    let raf
    let last = performance.now()
    let hudT = 0
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const live = rosState === 'connected'
      if (!live) step(sim.current, dt)
      const v = view.current
      if (!mode3dRef.current || live) {
        ctx.clearRect(0, 0, v.w, v.h)
        drawStatic(ctx, sim.current, v, layersRef.current)
        if (live) drawRos(ctx, v, ros.current)
        else drawDynamic(ctx, sim.current, v, layersRef.current)
      }
      hudT -= dt
      if (hudT <= 0) {
        hudT = 0.12
        setHud(status(sim.current))
        setLog(sim.current.log.slice(0, 9))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [rosState])

  const onClick = (e) => {
    const r = canvas.current.getBoundingClientRect()
    const { s, ox, oy } = view.current
    const gx = (e.clientX - r.left - ox) / s
    const gy = (e.clientY - r.top - oy) / s
    pick(gx, gy, e.shiftKey)
  }

  const pick = (gx, gy, shift) => {
    if (gx < 0 || gy < 0 || gx >= W || gy >= H) return
    if (rosState === 'connected') {
      ros.current.conn?.sendGoal(gx * RES, (H - gy) * RES)
      return
    }
    if (wpMode || shift) addWaypoint(sim.current, gx, gy)
    else setGoal(sim.current, gx, gy)
  }

  const toggleRos = () => {
    if (rosState === 'connected' || rosState === 'connecting') {
      ros.current.conn?.close()
      ros.current = { conn: null, pose: null, plan: [] }
      setRosState('off')
      return
    }
    setRosState('connecting')
    ros.current.conn = connectRos(rosUrl, {
      onStatus: setRosState,
      onPose: (p) => { ros.current.pose = p },
      onPlan: (p) => { ros.current.plan = p },
    })
  }

  const s = sim.current
  const show3d = mode3d && rosState !== 'connected'
  return (
    <div className="live">
      <div className={`live-map${show3d ? ' is3d' : ''}`} ref={wrap}>
        <canvas ref={canvas} onClick={onClick} style={{ visibility: show3d ? 'hidden' : 'visible' }} />
        {show3d && (
          <Suspense fallback={<div className="loading3d">Loading 3D…</div>}>
            <Live3D sim={s} layers={layers} mode={cam} onPick={pick} />
          </Suspense>
        )}
        <div className="view-ctl">
          {show3d && (
            <div className="pill-seg">
              {CAMS.map(([k, label]) => (
                <button key={k} className={cam === k ? 'on' : ''} onClick={() => setCam(k)}>{label}</button>
              ))}
            </div>
          )}
          <div className="pill-seg">
            <button className={!mode3d ? 'on' : ''} onClick={() => setMode3d(false)}>2D</button>
            <button className={mode3d ? 'on' : ''} disabled={rosState === 'connected'} onClick={() => setMode3d(true)}>3D</button>
          </div>
        </div>
        <div className="hud-speed">
          <div className="hud-num">{Math.round(hud.kmh)}</div>
          <div className="hud-unit">km/h</div>
        </div>
        <div className="hud-goal">
          <span className={`dot ${hud.monitor}`} />
          {rosState === 'connected' ? 'Live Nav2 via rosbridge' : `${hud.goal}${hud.dist ? ` · ${Math.round(hud.dist)} m` : ''}`}
        </div>
        <div className="hud-hint">
          {rosState === 'connected'
            ? 'Click to send /goal_pose'
            : wpMode
              ? `Click the ${show3d ? 'ground' : 'map'} to add waypoints`
              : `Click the ${show3d ? 'ground' : 'map'} to send a goal · Shift-click adds a waypoint`}
        </div>
      </div>

      <aside className="live-side">
        <section>
          <h4>Mission</h4>
          <div className="seg">
            <button className={hud.loop ? 'on' : ''} onClick={() => setPatrol(s, true)}>Patrol stops</button>
            <button className={wpMode ? 'on' : ''} onClick={() => setWpMode((m) => !m)}>Waypoint mode</button>
          </div>
          <div className="seg">
            <button onClick={() => { s.goals = []; s.goal = null; s.path = []; s.raw = []; s.loop = false }}>Cancel</button>
            <button onClick={() => { const st = STOPS[2]; setGoal(s, st.x, st.y, st.name) }}>Go to Spa</button>
          </div>
        </section>

        <section>
          <h4>Nav2 servers</h4>
          <ul className="servers">
            {hud.servers.map(([name, val, st]) => (
              <li key={name}>
                <span className={`dot ${st}`} />
                <span className="srv">{name}</span>
                <span className="val">{val}</span>
              </li>
            ))}
          </ul>
          <div className="meta">Last plan {hud.planMs.toFixed(1)} ms · {hud.expanded} cells expanded</div>
        </section>

        <section>
          <h4>Layers</h4>
          <div className="layers">
            {LAYERS.map(([k, label]) => (
              <label key={k}>
                <input type="checkbox" checked={layers[k]} onChange={() => setLayers((l) => ({ ...l, [k]: !l[k] }))} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h4>Behavior tree log</h4>
          <ul className="log">
            {log.map((l, i) => (
              <li key={l.t + l.msg + i} className={l.kind}>
                <span className="t">{l.t.toFixed(1)}s</span>
                {l.msg}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>Connect to a real Nav2</h4>
          <div className="ros">
            <input value={rosUrl} onChange={(e) => setRosUrl(e.target.value)} spellCheck={false} />
            <button className={rosState === 'connected' ? 'on' : ''} onClick={toggleRos}>
              {rosState === 'connected' ? 'Disconnect' : rosState === 'connecting' ? 'Connecting…' : 'Connect'}
            </button>
          </div>
          <div className="meta">
            {rosState === 'error' ? 'Could not reach rosbridge. ' : ''}
            Uses rosbridge_server. Reads /amcl_pose and /plan, publishes /goal_pose. Assumes map origin at bottom-left, {RES} m per cell.
          </div>
        </section>
      </aside>
    </div>
  )
}

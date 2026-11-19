import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sky, OrbitControls, Environment, Lightformer, Html } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, ToneMapping, SMAA, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { W, H, STOPS } from './sim.js'
import { buildWorld, makeGrain, wx, wz } from './world3d.js'

const BOX = new THREE.BoxGeometry(1, 1, 1)
const SUN = [42, 70, 28]
const o3 = new THREE.Object3D()

// ---------- static voxels ----------
function Voxels({ items, children, cast = true, receive = true }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const m = ref.current
    items.forEach((it, i) => {
      o3.position.set(it.p[0], it.p[1], it.p[2])
      o3.rotation.set(0, 0, 0)
      if (it.s) o3.scale.set(it.s[0], it.s[1], it.s[2])
      else o3.scale.set(1, 1, 1)
      o3.updateMatrix()
      m.setMatrixAt(i, o3.matrix)
      m.setColorAt(i, it.c)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [items])
  if (!items.length) return null
  return (
    <instancedMesh ref={ref} args={[BOX, undefined, items.length]} castShadow={cast} receiveShadow={receive}>
      {children}
    </instancedMesh>
  )
}

const BLUE = new THREE.Color('#3e6ae1')
const RED = new THREE.Color('#e82127')
const AMBER = new THREE.Color('#e0a43a')

function Ground({ world, sim, layers, grain }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const m = ref.current
    world.ground.forEach((g, k) => {
      o3.position.set(wx(g.gx), -0.5, wz(g.gy))
      o3.scale.set(1, 1, 1)
      o3.updateMatrix()
      m.setMatrixAt(k, o3.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [world])
  useLayoutEffect(() => {
    const m = ref.current
    const c = new THREE.Color()
    world.ground.forEach((g, k) => {
      c.copy(g.base)
      const cost = sim.cost[g.i]
      if (layers.inflation && cost > 0 && !sim.occ[g.i]) c.lerp(BLUE, cost >= 253 ? 0.5 : (cost / 253) * 0.42)
      if (layers.filters && sim.keep[g.i]) c.lerp(RED, 0.45)
      if (layers.filters && sim.speed[g.i] && (g.gx + g.gy) % 4 < 2) c.lerp(AMBER, 0.35)
      m.setColorAt(k, c)
    })
    m.instanceColor.needsUpdate = true
  }, [world, sim, layers.inflation, layers.filters])
  return (
    <instancedMesh ref={ref} args={[BOX, undefined, world.ground.length]} receiveShadow>
      <meshStandardMaterial map={grain} roughness={0.95} />
    </instancedMesh>
  )
}

function World({ world, sim, layers }) {
  const grain = useMemo(() => makeGrain(), [])
  const S = world.sets
  return (
    <group>
      <Ground world={world} sim={sim} layers={layers} grain={grain} />
      <Voxels items={world.terrain} cast={false}><meshStandardMaterial map={grain} roughness={1} /></Voxels>
      <Voxels items={S.hedge}><meshStandardMaterial map={grain} roughness={0.9} /></Voxels>
      <Voxels items={S.wall}><meshStandardMaterial map={grain} roughness={0.85} /></Voxels>
      <Voxels items={S.glass}><meshStandardMaterial map={grain} roughness={0.08} metalness={0.4} emissive="#7fb2d6" emissiveIntensity={0.18} /></Voxels>
      <Voxels items={S.roof}><meshStandardMaterial map={grain} roughness={0.75} /></Voxels>
      <Voxels items={S.wood}><meshStandardMaterial map={grain} roughness={0.8} /></Voxels>
      <Voxels items={S.trunk}><meshStandardMaterial map={grain} roughness={0.9} /></Voxels>
      <Voxels items={S.leaves}><meshStandardMaterial map={grain} roughness={0.8} /></Voxels>
      <Voxels items={S.sand} cast={false}><meshStandardMaterial map={grain} roughness={1} /></Voxels>
      <Voxels items={S.water} cast={false} receive={false}>
        <meshStandardMaterial transparent opacity={0.82} roughness={0.06} metalness={0.25} />
      </Voxels>
      <Voxels items={S.flower} cast={false}><meshStandardMaterial roughness={0.7} /></Voxels>
      <Voxels items={S.tuft} cast={false}><meshStandardMaterial map={grain} roughness={0.9} /></Voxels>
      <Voxels items={S.lampPost}><meshStandardMaterial roughness={0.5} metalness={0.6} /></Voxels>
      <Voxels items={S.lamp} cast={false}><meshStandardMaterial emissive="#ffe3a0" emissiveIntensity={2.2} toneMapped={false} /></Voxels>
      <Voxels items={S.stone}><meshStandardMaterial map={grain} roughness={0.6} /></Voxels>
      {layers.filters && (
        <Voxels items={S.post}><meshStandardMaterial roughness={0.5} /></Voxels>
      )}
      {STOPS.map((s) => (
        <group key={s.name} position={[wx(s.x), 1.4, wz(s.y)]}>
          <mesh>
            <boxGeometry args={[0.42, 0.42, 0.42]} />
            <meshStandardMaterial color="#3e6ae1" emissive="#3e6ae1" emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
          <Html center position={[0, 1.1, 0]} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
            <div className="label3d">{s.name}</div>
          </Html>
        </group>
      ))}
    </group>
  )
}

// ---------- cart ----------
const part = (args, pos, color, extra = {}) => ({ args, pos, color, extra })
const CART = [
  part([2.6, 0.25, 1.2], [0, 0.45, 0], '#2a2d33'),
  part([2.5, 0.35, 1.3], [0, 0.7, 0], '#f2f3f5'),
  part([0.7, 0.5, 1.25], [1.0, 1.0, 0], '#f2f3f5'),
  part([0.5, 0.45, 1.3], [-1.05, 1.0, 0], '#f2f3f5'),
  part([2.52, 0.07, 1.33], [0, 0.88, 0], '#3e6ae1', { emissive: '#3e6ae1', emissiveIntensity: 0.4 }),
  part([0.5, 0.2, 1.05], [0.2, 1.0, 0], '#3b3f48'),
  part([0.12, 0.55, 1.05], [-0.08, 1.3, 0], '#4a4f5a'),
  part([0.45, 0.2, 1.05], [-0.55, 1.0, 0], '#3b3f48'),
  part([0.12, 0.55, 1.05], [-0.82, 1.3, 0], '#4a4f5a'),
  part([0.08, 1.25, 0.08], [0.72, 1.62, 0.58], '#2a2d33'),
  part([0.08, 1.25, 0.08], [0.72, 1.62, -0.58], '#2a2d33'),
  part([0.08, 1.35, 0.08], [-1.15, 1.6, 0.58], '#2a2d33'),
  part([0.08, 1.35, 0.08], [-1.15, 1.6, -0.58], '#2a2d33'),
  part([2.4, 0.1, 1.45], [-0.2, 2.28, 0], '#f2f3f5'),
  part([2.1, 0.04, 1.25], [-0.2, 2.35, 0], '#3e6ae1', { emissive: '#3e6ae1', emissiveIntensity: 0.25 }),
  part([0.32, 0.18, 0.32], [0.45, 2.44, 0], '#15171b'),
  part([0.06, 0.12, 0.22], [1.36, 1.0, 0.42], '#ffffff', { emissive: '#fff4d6', emissiveIntensity: 3, toneMapped: false }),
  part([0.06, 0.12, 0.22], [1.36, 1.0, -0.42], '#ffffff', { emissive: '#fff4d6', emissiveIntensity: 3, toneMapped: false }),
  part([0.06, 0.1, 0.18], [-1.31, 1.05, 0.5], '#ff2020', { emissive: '#ff1a1a', emissiveIntensity: 2.5, toneMapped: false }),
  part([0.06, 0.1, 0.18], [-1.31, 1.05, -0.5], '#ff2020', { emissive: '#ff1a1a', emissiveIntensity: 2.5, toneMapped: false }),
]
const WHEELS = [[0.85, 0.62], [0.85, -0.62], [-0.85, 0.62], [-0.85, -0.62]]

function Cart({ sim, layers }) {
  const g = useRef()
  const wheels = useRef([])
  const lidar = useRef()
  const slow = useRef()
  const stop = useRef()
  useFrame((_, dt) => {
    g.current.position.set(sim.x - W / 2, 0, sim.y - H / 2)
    g.current.rotation.y = -sim.th
    wheels.current.forEach((w) => w && (w.rotation.z -= sim.v * dt * 3.3))
    lidar.current.rotation.y += dt * 12
    const m = sim.monitor
    slow.current.material.opacity = m === 'slow' ? 0.3 : 0.08
    stop.current.material.opacity = m === 'stop' ? 0.45 : 0.1
  })
  return (
    <group ref={g}>
      {CART.map((p, i) => (
        <mesh key={i} position={p.pos} castShadow receiveShadow>
          <boxGeometry args={p.args} />
          <meshStandardMaterial color={p.color} roughness={0.45} metalness={0.05} {...p.extra} />
        </mesh>
      ))}
      <mesh position={[0.8, 1.62, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.04, 0.72, 1.18]} />
        <meshStandardMaterial color="#bfe3ff" transparent opacity={0.28} roughness={0.05} metalness={0.3} />
      </mesh>
      <mesh ref={lidar} position={[0.45, 2.56, 0]}>
        <boxGeometry args={[0.36, 0.06, 0.08]} />
        <meshStandardMaterial color="#3e6ae1" emissive="#5d86ff" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {WHEELS.map(([x, z], i) => (
        <mesh key={i} ref={(el) => (wheels.current[i] = el)} position={[x, 0.3, z]} castShadow>
          <boxGeometry args={[0.6, 0.6, 0.28]} />
          <meshStandardMaterial color="#1b1d22" roughness={0.9} />
        </mesh>
      ))}
      <group visible={layers.monitor}>
        <mesh ref={slow} position={[3.75, 0.03, 0]}>
          <boxGeometry args={[7.5, 0.04, 4.8]} />
          <meshBasicMaterial color="#e0a43a" transparent opacity={0.08} depthWrite={false} />
        </mesh>
        <mesh ref={stop} position={[1.7, 0.05, 0]}>
          <boxGeometry args={[3.4, 0.05, 3]} />
          <meshBasicMaterial color="#e82127" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

// ---------- pedestrians ----------
const SHIRTS = ['#e85d5d', '#3e6ae1', '#f2c14e', '#5cb38a', '#9b7cf0']
const SKIN = ['#f0c9a0', '#c99a6e', '#8d5a3b', '#e5b48a', '#b07a52']

function Person({ sim, i }) {
  const g = useRef()
  const legL = useRef(), legR = useRef(), armL = useRef(), armR = useRef()
  const phase = useRef(i)
  useFrame((_, dt) => {
    const p = sim.peds[i]
    g.current.position.set(p.x - W / 2, 0, p.y - H / 2)
    const ang = Math.atan2((p.b[1] - p.a[1]) * p.dir, (p.b[0] - p.a[0]) * p.dir)
    g.current.rotation.y = -ang
    phase.current += dt * 7
    const sw = Math.sin(phase.current) * 0.55
    legL.current.rotation.z = sw
    legR.current.rotation.z = -sw
    armL.current.rotation.z = -sw * 0.8
    armR.current.rotation.z = sw * 0.8
  })
  const shirt = SHIRTS[i % SHIRTS.length]
  const skin = SKIN[i % SKIN.length]
  const limb = (ref, y, z, h, w, color) => (
    <group ref={ref} position={[0, y, z]}>
      <mesh position={[0, -h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, w]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  )
  return (
    <group ref={g}>
      {limb(legL, 0.8, 0.12, 0.8, 0.2, '#2f3a4c')}
      {limb(legR, 0.8, -0.12, 0.8, 0.2, '#2f3a4c')}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.7, 0.5]} />
        <meshStandardMaterial color={shirt} roughness={0.85} />
      </mesh>
      {limb(armL, 1.48, 0.33, 0.65, 0.14, shirt)}
      {limb(armR, 1.48, -0.33, 0.65, 0.14, shirt)}
      <mesh position={[0, 1.67, 0]} castShadow>
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.87, 0]} castShadow>
        <boxGeometry args={[0.36, 0.08, 0.36]} />
        <meshStandardMaterial color={i % 2 ? '#3a2a1e' : '#f1e3b5'} roughness={0.8} />
      </mesh>
    </group>
  )
}

// ---------- Nav2 overlays ----------
function Pool({ max, children, refOut }) {
  const ref = useRef()
  useLayoutEffect(() => {
    ref.current.count = 0
    refOut.current = ref.current
  }, [refOut])
  return (
    <instancedMesh ref={ref} args={[BOX, undefined, max]} frustumCulled={false}>
      {children}
    </instancedMesh>
  )
}

function setInst(mesh, k, x, y, z, sx, sy, sz, ry = 0) {
  o3.position.set(x, y, z)
  o3.scale.set(sx, sy, sz)
  o3.rotation.set(0, ry, 0)
  o3.updateMatrix()
  mesh.setMatrixAt(k, o3.matrix)
}

function Overlays({ sim, layers }) {
  const lidarPts = useRef(), path = useRef(), raw = useRef(), obs = useRef(), arc = useRef()
  const rays = useRef()
  const look = useRef()
  const beacons = useRef([])
  const rayGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(200 * 6), 3))
    return g
  }, [])

  useFrame((st) => {
    const L = layers
    const cx = sim.x - W / 2, cz = sim.y - H / 2

    // lidar
    let n = 0
    const pos = rayGeo.attributes.position.array
    if (L.lidar) {
      for (const [hx, hy, ped] of sim.hits) {
        if (n >= 200) break
        const x = hx - W / 2, z = hy - H / 2
        setInst(lidarPts.current, n, x, ped ? 0.9 : 0.5, z, 0.14, 0.14, 0.14)
        pos.set([cx, 2.5, cz, x, ped ? 0.9 : 0.5, z], n * 6)
        n++
      }
    }
    lidarPts.current.count = n
    lidarPts.current.instanceMatrix.needsUpdate = true
    rayGeo.setDrawRange(0, n * 2)
    rayGeo.attributes.position.needsUpdate = true

    // global plan: smoothed path as glowing tiles, raw A* as dots
    n = 0
    let m = 0
    if (L.global && sim.path.length > 1) {
      const P = sim.path
      let next = 0 // distance into the current segment where the next tile goes
      for (let i = Math.max(1, sim.pathIdx); i < P.length && n < 600; i++) {
        const [ax, ay] = P[i - 1], [bx, by] = P[i]
        const seg = Math.hypot(bx - ax, by - ay)
        const ang = Math.atan2(by - ay, bx - ax)
        while (next < seg && n < 600) {
          const t = next / seg
          setInst(path.current, n++, ax + (bx - ax) * t - W / 2, 0.035, ay + (by - ay) * t - H / 2, 0.42, 0.05, 0.24, -ang)
          next += 0.55
        }
        next -= seg
      }
      for (let i = 0; i < sim.raw.length && m < 600; i += 2) {
        const [x, y] = sim.raw[i]
        setInst(raw.current, m++, x - W / 2, 0.02, y - H / 2, 0.14, 0.03, 0.14)
      }
    }
    path.current.count = n
    path.current.instanceMatrix.needsUpdate = true
    raw.current.count = m
    raw.current.instanceMatrix.needsUpdate = true

    // obstacle layer marks
    n = 0
    if (L.obstacles) {
      for (let i = 0; i < W * H && n < 400; i++) {
        const t = sim.obs[i]
        if (t <= 0) continue
        setInst(obs.current, n++, (i % W) + 0.5 - W / 2, 0.02, ((i / W) | 0) + 0.5 - H / 2, 0.96, 0.04 + t * 0.12, 0.96)
      }
    }
    obs.current.count = n
    obs.current.instanceMatrix.needsUpdate = true

    // local controller: predicted arc + lookahead marker
    n = 0
    if (L.local && sim.look) {
      let x = sim.x, y = sim.y, th = sim.th
      const v0 = Math.max(Math.abs(sim.v), 1.2)
      for (let i = 0; i < 22; i++) {
        x += v0 * Math.cos(th) * 0.09
        y += v0 * Math.sin(th) * 0.09
        th += v0 * sim.k * 0.09
        if (i % 2) setInst(arc.current, n++, x - W / 2, 0.06, y - H / 2, 0.16, 0.04, 0.16)
      }
      look.current.visible = true
      look.current.position.set(sim.look[0] - W / 2, 0.7 + Math.sin(st.clock.elapsedTime * 4) * 0.08, sim.look[1] - H / 2)
      look.current.rotation.y += 0.05
    } else look.current.visible = false
    arc.current.count = n
    arc.current.instanceMatrix.needsUpdate = true

    // goal + waypoint beacons
    const goals = L.waypoints ? [sim.goal, ...sim.goals].filter(Boolean) : []
    beacons.current.forEach((b, i) => {
      if (!b) return
      const gl = goals[i]
      b.visible = !!gl
      if (gl) {
        b.position.set(gl.x - W / 2, 0, gl.y - H / 2)
        b.children[1].rotation.y = st.clock.elapsedTime * 1.5
        b.children[1].position.y = 2.2 + Math.sin(st.clock.elapsedTime * 2 + i) * 0.15
      }
    })
  })

  return (
    <group>
      <Pool max={200} refOut={lidarPts}>
        <meshStandardMaterial color="#ff3b3b" emissive="#ff2a2a" emissiveIntensity={4} toneMapped={false} />
      </Pool>
      <lineSegments ref={rays} geometry={rayGeo} frustumCulled={false} visible={layers.lidar}>
        <lineBasicMaterial color="#ff4040" transparent opacity={0.07} depthWrite={false} />
      </lineSegments>
      <Pool max={600} refOut={path}>
        <meshStandardMaterial color="#5d86ff" emissive="#3e6ae1" emissiveIntensity={2.2} toneMapped={false} />
      </Pool>
      <Pool max={600} refOut={raw}>
        <meshStandardMaterial color="#8f9297" roughness={0.6} />
      </Pool>
      <Pool max={400} refOut={obs}>
        <meshStandardMaterial color="#171a20" transparent opacity={0.45} depthWrite={false} />
      </Pool>
      <Pool max={24} refOut={arc}>
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.4} toneMapped={false} />
      </Pool>
      <mesh ref={look} castShadow>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={i} ref={(el) => (beacons.current[i] = el)} visible={false}>
          <mesh position={[0, 6, 0]}>
            <boxGeometry args={[0.55, 12, 0.55]} />
            <meshBasicMaterial color={i === 0 ? '#3e6ae1' : '#ffffff'} transparent opacity={i === 0 ? 0.22 : 0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={i === 0 ? '#3e6ae1' : '#f4f4f4'} emissive={i === 0 ? '#3e6ae1' : '#ffffff'} emissiveIntensity={i === 0 ? 2.5 : 0.8} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------- camera + picking ----------
function Rig({ sim, mode }) {
  const { camera } = useThree()
  const want = useMemo(() => new THREE.Vector3(), [])
  const at = useMemo(() => new THREE.Vector3(), [])
  const lookAt = useRef(new THREE.Vector3())
  useEffect(() => {
    if (mode === 'orbit') { camera.position.set(-38, 48, 62); camera.lookAt(0, 0, 0) }
    if (mode === 'top') { camera.position.set(0, 92, 0.01); camera.lookAt(0, 0, 0) }
  }, [mode, camera])
  useFrame((_, dt) => {
    if (mode !== 'chase') return
    const dx = Math.cos(sim.th), dz = Math.sin(sim.th)
    const cx = sim.x - W / 2, cz = sim.y - H / 2
    want.set(cx - dx * 10, 6.2, cz - dz * 10)
    at.set(cx + dx * 5, 1, cz + dz * 5)
    const k = 1 - Math.exp(-dt * 3)
    camera.position.lerp(want, k)
    lookAt.current.lerp(at, k)
    camera.lookAt(lookAt.current)
  })
  return mode === 'orbit' ? (
    <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={1.42} minDistance={8} maxDistance={160} enableDamping />
  ) : null
}

function Picker({ onPick }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.02, 0]}
      onClick={(e) => {
        if (e.delta > 4) return
        e.stopPropagation()
        onPick(e.point.x + W / 2, e.point.z + H / 2, e.nativeEvent.shiftKey)
      }}
    >
      <planeGeometry args={[W, H]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

export default function Live3D({ sim, layers, mode, onPick }) {
  const world = useMemo(() => buildWorld(sim), [sim])
  return (
    <Canvas
      className="live3d"
      shadows="soft"
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [-38, 48, 62], fov: 42, near: 0.1, far: 900 }}
    >
      <Sky distance={4500} sunPosition={SUN} turbidity={5} rayleigh={1.1} mieCoefficient={0.004} mieDirectionalG={0.86} />
      <fog attach="fog" args={['#cfdde8', 90, 300]} />
      <hemisphereLight args={['#dcebff', '#5d7a43', 0.55]} />
      <directionalLight
        position={SUN}
        intensity={2.6}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-72}
        shadow-camera-right={72}
        shadow-camera-top={72}
        shadow-camera-bottom={-72}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <Environment resolution={128} environmentIntensity={0.45}>
        <Lightformer intensity={1.6} color="#ffffff" position={[0, 30, 0]} rotation-x={Math.PI / 2} scale={[80, 80, 1]} />
        <Lightformer intensity={0.8} color="#bcd7ff" position={[-40, 10, -20]} scale={[40, 20, 1]} />
        <Lightformer intensity={0.6} color="#ffe2c2" position={[40, 8, 30]} scale={[40, 20, 1]} />
      </Environment>

      <World world={world} sim={sim} layers={layers} />
      <Overlays sim={sim} layers={layers} />
      <Cart sim={sim} layers={layers} />
      {sim.peds.map((_, i) => <Person key={i} sim={sim} i={i} />)}
      <Picker onPick={onPick} />
      <Rig sim={sim} mode={mode} />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO halfRes aoRadius={2.2} intensity={2.4} distanceFalloff={1.2} quality="medium" />
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.7} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.3} darkness={0.35} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}

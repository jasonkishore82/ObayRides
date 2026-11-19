import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import GolfCart from './GolfCart.jsx'
import { curve } from './route.js'
import { LAKE, LODGE, POOL, SPA, GAZEBO, VILLAS, TREES, FLOWERS, LAMPS } from './world.js'

export const RESORT_NAME = 'The Blubay'

const flat = (c, extra = {}) => <meshStandardMaterial color={c} flatShading roughness={0.9} {...extra} />

// ---------- ground, road, lake ----------
function ribbon(offset, width, y, n = 260) {
  const pos = []
  const idx = []
  for (let i = 0; i <= n; i++) {
    const u = (i / n) % 1
    const p = curve.getPointAt(u)
    const t = curve.getTangentAt(u)
    const nx = -t.z
    const nz = t.x
    const cx = p.x + nx * offset
    const cz = p.z + nz * offset
    pos.push(cx + nx * width / 2, y, cz + nz * width / 2, cx - nx * width / 2, y, cz - nz * width / 2)
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function Road() {
  const road = useMemo(() => ribbon(0, 6.4, 0.04), [])
  const guide = useMemo(() => ribbon(0, 0.35, 0.08), [])
  const edgeL = useMemo(() => ribbon(3.0, 0.25, 0.08), [])
  const edgeR = useMemo(() => ribbon(-3.0, 0.25, 0.08), [])
  return (
    <group>
      <mesh geometry={road} receiveShadow><meshStandardMaterial color="#c9b99b" flatShading side={THREE.DoubleSide} /></mesh>
      <mesh geometry={edgeL}><meshBasicMaterial color="#fff8ea" side={THREE.DoubleSide} /></mesh>
      <mesh geometry={edgeR}><meshBasicMaterial color="#fff8ea" side={THREE.DoubleSide} /></mesh>
      <mesh geometry={guide}><meshBasicMaterial color="#4a90ff" side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

function Lake() {
  return (
    <group position={[LAKE.x, 0, LAKE.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <ringGeometry args={[LAKE.r, LAKE.r + 4, 24]} />
        {flat('#e6d8b8')}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[LAKE.r, 14]} />
        <meshStandardMaterial color="#4fc3d9" flatShading roughness={0.3} metalness={0.1} />
      </mesh>
      {/* small island with a palm-like tree */}
      <mesh position={[4, 0.1, -3]}>
        <cylinderGeometry args={[2.4, 3, 0.5, 7]} />
        {flat('#e6d8b8')}
      </mesh>
      <mesh position={[4, 1.7, -3]}>
        <cylinderGeometry args={[0.12, 0.2, 3, 5]} />
        {flat('#8a6a46')}
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[4 + Math.cos(i * 1.256) * 0.8, 3.2, -3 + Math.sin(i * 1.256) * 0.8]} rotation={[Math.sin(i * 1.256) * 0.5, 0, -Math.cos(i * 1.256) * 0.5]}>
          <boxGeometry args={[0.2, 0.08, 1.6]} />
          {flat('#3fae5a')}
        </mesh>
      ))}
    </group>
  )
}

// ---------- buildings ----------
function HipRoof({ w, d, h, y, color }) {
  return (
    <mesh position={[0, y + h / 2, 0]} rotation={[0, Math.PI / 4, 0]} scale={[(w + 1) / 1.414, h, (d + 1) / 1.414]} castShadow>
      <coneGeometry args={[1, 1, 4]} />
      {flat(color)}
    </mesh>
  )
}

function Windows({ w, d, h, rows = 1 }) {
  const n = Math.max(1, Math.floor(w / 3.2))
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const x = -w / 2 + (w / n) * (i + 0.5)
        return Array.from({ length: rows }).map((_, j) => (
          <mesh key={`${i}-${j}`} position={[x, 1.2 + j * 2.4, d / 2 + 0.03]}>
            <boxGeometry args={[1, 1.1, 0.06]} />
            <meshStandardMaterial color="#8fd3ff" emissive="#4aa8e8" emissiveIntensity={0.35} flatShading />
          </mesh>
        ))
      })}
    </>
  )
}

function Villa({ x, z, w, d, h, color }) {
  const rot = Math.atan2(-x, -z) // face the resort centre
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {flat(color)}
      </mesh>
      <HipRoof w={w} d={d} h={2.4} y={h} color="#d9744a" />
      <Windows w={w} d={d} h={h} />
      <mesh position={[0, 0.9, d / 2 + 0.03]}>
        <boxGeometry args={[0.9, 1.8, 0.06]} />
        {flat('#7a4b2a')}
      </mesh>
      {/* porch */}
      <mesh position={[0, 0.1, d / 2 + 1]} receiveShadow>
        <boxGeometry args={[w * 0.7, 0.2, 2]} />
        {flat('#d9c9a6')}
      </mesh>
    </group>
  )
}

function Lodge() {
  const { x, z, w, d, h } = LODGE
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {flat('#fbf3e4')}
      </mesh>
      <HipRoof w={w} d={d} h={3.6} y={h} color="#2f8fc4" />
      <Windows w={w} d={d} h={h} rows={2} />
      {/* entrance portico */}
      <mesh position={[0, 3, d / 2 + 1.5]} castShadow>
        <boxGeometry args={[8, 0.4, 3.4]} />
        {flat('#2f8fc4')}
      </mesh>
      {[-3.4, 3.4].map((px) => (
        <mesh key={px} position={[px, 1.5, d / 2 + 2.9]}>
          <cylinderGeometry args={[0.25, 0.25, 3, 6]} />
          {flat('#ffffff')}
        </mesh>
      ))}
      <Html position={[0, h + 4.6, 0]} center distanceFactor={26} transform={false} zIndexRange={[5, 0]}>
        <div className="resort-sign">{RESORT_NAME}</div>
      </Html>
    </group>
  )
}

function Spa() {
  const { x, z, w, d, h } = SPA
  return (
    <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {flat('#e9f1e4')}
      </mesh>
      <HipRoof w={w} d={d} h={2.6} y={h} color="#6fae7a" />
      <Windows w={w} d={d} h={h} />
    </group>
  )
}

function Gazebo() {
  return (
    <group position={[GAZEBO.x, 0, GAZEBO.z]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[3.2, 3.4, 0.3, 6]} />
        {flat('#e6d8b8')}
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI) / 3) * 2.7, 1.7, Math.sin((i * Math.PI) / 3) * 2.7]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 3, 5]} />
          {flat('#ffffff')}
        </mesh>
      ))}
      <mesh position={[0, 3.7, 0]} castShadow>
        <coneGeometry args={[3.8, 1.8, 6]} />
        {flat('#e0603a')}
      </mesh>
    </group>
  )
}

function Pool() {
  const { x, z, w, d } = POOL
  const umbrellas = [
    [-5, -5.2, '#ff7aa8'], [0, -5.2, '#ffd45e'], [5, -5.2, '#4fc3d9'],
  ]
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[w + 3, 0.16, d + 3]} />
        {flat('#efe6d0')}
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#38d0e8" flatShading emissive="#1aa7c4" emissiveIntensity={0.25} roughness={0.2} />
      </mesh>
      {umbrellas.map(([ux, uz, c], i) => (
        <group key={i} position={[ux, 0, uz]}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 2.4, 4]} />
            {flat('#ffffff')}
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <coneGeometry args={[1.4, 0.6, 6]} />
            {flat(c)}
          </mesh>
          <mesh position={[0, 0.3, 1.2]}>
            <boxGeometry args={[0.7, 0.2, 1.6]} />
            {flat('#ffffff')}
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------- nature ----------
function Trees() {
  const trunks = useRef()
  const cones = useRef()
  const balls = useRef()
  const pines = useMemo(() => TREES.filter((t) => t.type === 'pine'), [])
  const rounds = useMemo(() => TREES.filter((t) => t.type === 'round'), [])
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.3, 1.6, 5).translate(0, 0.8, 0), [])
  const coneGeo = useMemo(() => new THREE.ConeGeometry(1.7, 4.2, 6).translate(0, 3.4, 0), [])
  const ballGeo = useMemo(() => new THREE.IcosahedronGeometry(1.8, 0).translate(0, 3.2, 0), [])

  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const place = (mesh, list) => {
      list.forEach((t, i) => {
        o.position.set(t.x, 0, t.z)
        o.rotation.y = i * 1.7
        o.scale.setScalar(t.s)
        o.updateMatrix()
        mesh.setMatrixAt(i, o.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    place(trunks.current, TREES)
    place(cones.current, pines)
    place(balls.current, rounds)
  }, [pines, rounds])

  return (
    <>
      <instancedMesh ref={trunks} args={[trunkGeo, undefined, TREES.length]} castShadow>
        {flat('#8a6a46')}
      </instancedMesh>
      <instancedMesh ref={cones} args={[coneGeo, undefined, pines.length]} castShadow>
        {flat('#3f9a5a')}
      </instancedMesh>
      <instancedMesh ref={balls} args={[ballGeo, undefined, rounds.length]} castShadow>
        {flat('#5cbd62')}
      </instancedMesh>
    </>
  )
}

function Flowers() {
  const ref = useRef()
  const geo = useMemo(() => new THREE.DodecahedronGeometry(0.38, 0).translate(0, 0.3, 0), [])
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    FLOWERS.forEach((f, i) => {
      o.position.set(f.x, 0, f.z)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
      ref.current.setColorAt(i, c.set(f.color))
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.instanceColor.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[geo, undefined, FLOWERS.length]}>
      <meshStandardMaterial flatShading />
    </instancedMesh>
  )
}

function Lamps() {
  return LAMPS.map((l, i) => (
    <group key={i} position={[l.x, 0, l.z]}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 2.8, 5]} />
        {flat('#3a3f48')}
      </mesh>
      <mesh position={[0, 2.9, 0]}>
        <icosahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color="#fff2c0" emissive="#ffe08a" emissiveIntensity={1.2} flatShading />
      </mesh>
    </group>
  ))
}

function Hills() {
  const hills = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2
        const r = 125 + (i % 3) * 12
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 24 + (i * 7) % 18, h: 26 + (i * 11) % 24, c: i % 2 ? '#79b98a' : '#6aa97c' }
      }),
    [],
  )
  return hills.map((h, i) => (
    <mesh key={i} position={[h.x, h.h / 2 - 2, h.z]}>
      <coneGeometry args={[h.s, h.h, 6]} />
      {flat(h.c)}
    </mesh>
  ))
}

function Clouds() {
  const g = useRef()
  useFrame((_, dt) => {
    if (g.current) g.current.position.x = ((g.current.position.x + dt * 1.2 + 160) % 320) - 160
  })
  const spots = [[-60, 55, -30], [30, 62, -70], [90, 58, 20], [-20, 66, 70]]
  return (
    <group ref={g}>
      {spots.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[k * 5 - 5, k === 1 ? 1.5 : 0, 0]} scale={[1, 0.6, 0.8]}>
              <icosahedronGeometry args={[4 + k, 0]} />
              <meshStandardMaterial color="#ffffff" flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ---------- people ----------
function Walker({ angle, dir, color, hat }) {
  const g = useRef()
  const a = useRef(angle)
  const R = LAKE.r + 2.2
  useFrame((st, dt) => {
    a.current += (dir * 0.8 * dt) / R
    const x = LAKE.x + Math.cos(a.current) * R
    const z = LAKE.z + Math.sin(a.current) * R
    if (!g.current) return
    g.current.position.set(x, Math.abs(Math.sin(st.clock.elapsedTime * 6 + angle)) * 0.06, z)
    g.current.rotation.y = Math.atan2(-Math.sin(a.current) * dir, Math.cos(a.current) * dir)
  })
  return (
    <group ref={g}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.26, 1, 6]} />
        {flat(color)}
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <icosahedronGeometry args={[0.2, 0]} />
        {flat('#f0c9a0')}
      </mesh>
      {hat && (
        <mesh position={[0, 1.62, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.04, 8]} />
          {flat('#f5e6b0')}
        </mesh>
      )}
    </group>
  )
}

function People() {
  const palette = ['#ff7a7a', '#ffd45e', '#6aa8ff', '#9a7cff', '#5cc7a0', '#ff9a5a', '#ffffff', '#ff6fb0']
  return palette.map((c, i) => (
    <Walker key={i} angle={(i / palette.length) * Math.PI * 2} dir={i % 3 === 0 ? -1 : 1} color={c} hat={i % 2 === 0} />
  ))
}

// ---------- the cart and cameras ----------
function SimCart({ speed, progress, mode }) {
  const g = useRef()
  const { camera } = useThree()
  const want = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])

  useLayoutEffect(() => {
    g.current.traverse((o) => {
      if (o.isMesh) o.castShadow = true
    })
  }, [])

  useFrame((_, dt) => {
    const u = progress.current
    const p = curve.getPointAt(u)
    const t = curve.getTangentAt(u)
    g.current.position.set(p.x, 0, p.z)
    g.current.rotation.y = Math.atan2(t.x, t.z)
    if (mode === 'chase') {
      want.set(p.x - t.x * 9, 4.6, p.z - t.z * 9)
      camera.position.lerp(want, 1 - Math.exp(-dt * 4))
      look.set(p.x + t.x * 6, 1.2, p.z + t.z * 6)
      camera.lookAt(look)
    }
  })

  return (
    <group ref={g}>
      <GolfCart speed={speed} />
    </group>
  )
}

function CameraMode({ mode }) {
  const { camera } = useThree()
  useEffect(() => {
    if (mode === 'aerial') {
      camera.position.set(0, 105, 120)
      camera.lookAt(0, 0, 0)
    }
  }, [mode, camera])
  return null
}

export default function ResortSim({ mode, speed, progress }) {
  return (
    <Canvas shadows camera={{ position: [0, 6, 50], fov: 55, far: 600 }} dpr={[1, 2]}>
      <color attach="background" args={['#bfe3f5']} />
      <fog attach="fog" args={['#bfe3f5', 90, 260]} />
      <hemisphereLight args={['#ffffff', '#9ad08a', 0.85]} />
      <directionalLight
        position={[50, 80, 35]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-95}
        shadow-camera-right={95}
        shadow-camera-top={95}
        shadow-camera-bottom={-95}
        shadow-camera-near={10}
        shadow-camera-far={220}
        shadow-bias={-0.0006}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        {flat('#94d17f')}
      </mesh>

      <Road />
      <Lake />
      <Lodge />
      <Spa />
      <Gazebo />
      <Pool />
      {VILLAS.map((v, i) => <Villa key={i} {...v} />)}
      <Trees />
      <Flowers />
      <Lamps />
      <People />
      <Hills />
      <Clouds />

      <SimCart speed={speed} progress={progress} mode={mode} />
      <CameraMode mode={mode} />
      <OrbitControls enabled={mode === 'aerial'} enablePan={false} target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.15} minDistance={30} maxDistance={220} />
    </Canvas>
  )
}

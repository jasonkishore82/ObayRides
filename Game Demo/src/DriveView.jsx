import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import GolfCart from './GolfCart.jsx'

const LANE_LEN = 120

function Scroller({ speed, children }) {
  const g = useRef()
  const off = useRef(0)
  useFrame((_, dt) => {
    off.current = (off.current + Math.max(speed.current, 1.5) * dt) % 8
    if (g.current) g.current.position.z = off.current
  })
  return <group ref={g}>{children}</group>
}

function Dashes({ x, color = '#cfd3da' }) {
  const items = useMemo(() => Array.from({ length: 22 }, (_, i) => -i * 8 + 16), [])
  return items.map((z) => (
    <mesh key={z} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.12, 3]} />
      <meshBasicMaterial color={color} />
    </mesh>
  ))
}

function GreyCar({ position, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.0, 0.45, 2.3]} />
        <meshStandardMaterial color="#6e7178" flatShading />
      </mesh>
      <mesh position={[0, 0.7, -0.1]}>
        <boxGeometry args={[0.85, 0.35, 1.2]} />
        <meshStandardMaterial color="#8a8d94" flatShading />
      </mesh>
    </group>
  )
}

const TRAFFIC = [
  [-2.2, -7],
  [2.2, -11],
  [-2.2, -17],
  [2.2, -23],
  [-2.2, -30],
  [2.2, -34],
]

function Traffic() {
  const g = useRef()
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current += dt
    if (g.current) g.current.position.z = Math.sin(t.current * 0.4) * 0.6
  })
  return (
    <group ref={g}>
      {TRAFFIC.map(([x, z], i) => (
        <GreyCar key={i} position={[x, 0, z]} />
      ))}
      <GreyCar position={[-9, 0, -44]} rotation={[0, Math.PI / 2, 0]} />
      <GreyCar position={[8, 0, -47]} rotation={[0, -Math.PI / 2, 0]} />
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 1.6, -55]}>
          <boxGeometry args={[0.35, 0.35, 0.1]} />
          <meshStandardMaterial color="#ff2b2b" emissive="#ff1a1a" emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  )
}

export default function DriveView({ speed }) {
  return (
    <Canvas camera={{ position: [0, 5.4, 8.5], fov: 50, rotation: [-0.42, 0, 0] }} dpr={[1, 2]}>
      <color attach="background" args={['#14161b']} />
      <fog attach="fog" args={['#14161b', 25, 70]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 10, 5]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -30]}>
        <planeGeometry args={[80, LANE_LEN]} />
        <meshStandardMaterial color="#1c1f26" flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]}>
        <planeGeometry args={[7.5, LANE_LEN]} />
        <meshStandardMaterial color="#262a32" flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -46]}>
        <planeGeometry args={[60, 7]} />
        <meshStandardMaterial color="#262a32" flatShading />
      </mesh>
      {[-3.6, 3.6].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -30]}>
          <planeGeometry args={[0.1, LANE_LEN]} />
          <meshBasicMaterial color="#e8eaee" />
        </mesh>
      ))}
      <Scroller speed={speed}>
        <Dashes x={0} />
        <Dashes x={-1.15} color="#e0b322" />
        <Dashes x={1.15} color="#e0b322" />
      </Scroller>
      <Traffic />
      <GolfCart speed={speed} rotation={[0, Math.PI, 0]} scale={0.9} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -26]}>
        <planeGeometry args={[1.3, 50]} />
        <meshBasicMaterial color="#2e7dff" transparent opacity={0.22} />
      </mesh>
    </Canvas>
  )
}

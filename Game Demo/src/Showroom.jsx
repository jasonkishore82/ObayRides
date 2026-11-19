import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import { useRef } from 'react'
import GolfCart from './GolfCart.jsx'

function Turntable({ speed }) {
  const g = useRef()
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.25
  })
  return (
    <group ref={g}>
      <GolfCart speed={speed} />
    </group>
  )
}

export default function Showroom({ speed }) {
  return (
    <Canvas camera={{ position: [4.6, 2.6, 5], fov: 38 }} dpr={[1, 2]}>
      <color attach="background" args={['#0d0f13']} />
      <fog attach="fog" args={['#0d0f13', 10, 22]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 4]} intensity={1.6} />
      <directionalLight position={[-6, 3, -5]} intensity={0.6} color="#6aa0ff" />
      <Turntable speed={speed} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7, 6]} />
        <meshStandardMaterial color="#171a20" flatShading />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={9} blur={2.4} far={3} />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={11} maxPolarAngle={Math.PI / 2.1} />
    </Canvas>
  )
}

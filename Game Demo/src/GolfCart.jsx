import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const M = ({ c, ...p }) => <meshStandardMaterial color={c} flatShading roughness={0.7} {...p} />

function Wheel({ position, spin }) {
  const ref = useRef()
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.x -= spin.current * dt * 4
  })
  return (
    <group position={position}>
      <group ref={ref}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.22, 8]} />
          <M c="#1b1d22" />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.24, 6]} />
          <M c="#b8bcc4" />
        </mesh>
      </group>
    </group>
  )
}

// Low-poly 4-seat golf cart. Faces +z. `speed` is a ref (m/s) used to spin the wheels.
export default function GolfCart({ speed, color = '#f4f5f7', accent = '#2e7dff', scanning = true, ...props }) {
  const spin = speed ?? { current: 0 }
  const lidar = useRef()
  useFrame((_, dt) => {
    if (lidar.current && scanning) lidar.current.rotation.y += dt * 6
  })

  return (
    <group {...props}>
      {/* chassis */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[1.25, 0.16, 2.9]} />
        <M c="#2a2d33" />
      </mesh>
      {/* lower body / floor */}
      <mesh position={[0, 0.55, -0.1]}>
        <boxGeometry args={[1.3, 0.22, 2.5]} />
        <M c={color} />
      </mesh>
      {/* front cowl */}
      <mesh position={[0, 0.72, 1.05]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[1.25, 0.5, 0.9]} />
        <M c={color} />
      </mesh>
      {/* front bumper */}
      <mesh position={[0, 0.5, 1.58]}>
        <boxGeometry args={[1.2, 0.16, 0.14]} />
        <M c="#2a2d33" />
      </mesh>
      {/* accent stripe */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.32, 0.05, 2.0]} />
        <M c={accent} emissive={accent} emissiveIntensity={0.4} />
      </mesh>
      {/* headlights */}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.78, 1.52]}>
          <boxGeometry args={[0.24, 0.12, 0.06]} />
          <M c="#fff7d0" emissive="#fff2b0" emissiveIntensity={1.4} />
        </mesh>
      ))}
      {/* rear body */}
      <mesh position={[0, 0.8, -1.22]}>
        <boxGeometry args={[1.3, 0.3, 0.26]} />
        <M c={color} />
      </mesh>
      {/* taillights */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.82, -1.37]}>
          <boxGeometry args={[0.18, 0.1, 0.05]} />
          <M c="#ff2b2b" emissive="#ff1a1a" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {/* seats */}
      {/* front bench */}
      <mesh position={[0, 0.78, 0.25]}>
        <boxGeometry args={[1.05, 0.18, 0.5]} />
        <M c="#3b3f48" />
      </mesh>
      <mesh position={[0, 1.12, -0.08]}>
        <boxGeometry args={[1.05, 0.5, 0.12]} />
        <M c="#4a4f5a" />
      </mesh>
      {/* rear bench: cushion sits on the floor, backrest just in front of the rear deck */}
      <mesh position={[0, 0.78, -0.65]}>
        <boxGeometry args={[1.05, 0.18, 0.5]} />
        <M c="#3b3f48" />
      </mesh>
      <mesh position={[0, 1.12, -0.98]}>
        <boxGeometry args={[1.05, 0.5, 0.12]} />
        <M c="#4a4f5a" />
      </mesh>
      {/* dashboard, steering wheel, display */}
      <mesh position={[0, 1.02, 0.78]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[1.1, 0.34, 0.14]} />
        <M c="#1f2228" />
      </mesh>
      <mesh position={[-0.3, 1.18, 0.62]} rotation={[-0.9, 0, 0]}>
        <torusGeometry args={[0.15, 0.025, 4, 8]} />
        <M c="#111111" />
      </mesh>
      <mesh position={[0.15, 1.12, 0.74]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.34, 0.2, 0.03]} />
        <M c="#0b1220" emissive={accent} emissiveIntensity={0.6} />
      </mesh>
      {/* windshield */}
      <mesh position={[0, 1.38, 0.82]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.18, 0.62, 0.04]} />
        <meshStandardMaterial color="#9fd4ff" transparent opacity={0.35} flatShading />
      </mesh>
      {/* roof posts */}
      {[
        [-0.6, 0.85],
        [0.6, 0.85],
        [-0.6, -1.25],
        [0.6, -1.25],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, i < 2 ? 1.38 : 1.45, z]}>
          <boxGeometry args={[0.06, i < 2 ? 0.95 : 1.0, 0.06]} />
          <M c="#2a2d33" />
        </mesh>
      ))}
      {/* roof */}
      <mesh position={[0, 1.95, -0.2]}>
        <boxGeometry args={[1.45, 0.07, 2.4]} />
        <M c={color} />
      </mesh>
      <mesh position={[0, 1.99, -0.2]}>
        <boxGeometry args={[1.3, 0.03, 2.2]} />
        <M c={accent} emissive={accent} emissiveIntensity={0.25} />
      </mesh>
      {/* lidar puck */}
      <group position={[0, 2.12, 0.55]}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.15, 0.16, 8]} />
          <M c="#15171b" />
        </mesh>
        <mesh ref={lidar} position={[0, 0.02, 0]}>
          <boxGeometry args={[0.3, 0.05, 0.05]} />
          <M c={accent} emissive={accent} emissiveIntensity={1.5} />
        </mesh>
      </group>
      {/* camera pod */}
      <mesh position={[0, 1.88, 0.98]}>
        <boxGeometry args={[0.3, 0.08, 0.1]} />
        <M c="#15171b" />
      </mesh>
      {/* wheels */}
      <Wheel position={[-0.68, 0.32, 0.95]} spin={spin} />
      <Wheel position={[0.68, 0.32, 0.95]} spin={spin} />
      <Wheel position={[-0.68, 0.32, -0.95]} spin={spin} />
      <Wheel position={[0.68, 0.32, -0.95]} spin={spin} />
    </group>
  )
}

import * as THREE from 'three'

// Closed resort loop in world metres (x right, z toward viewer). Shared by the 3D sim and the map.
const POINTS = [
  [0, 42], [32, 36], [50, 8], [42, -22], [14, -42],
  [-22, -40], [-48, -14], [-44, 16], [-20, 36],
]

export const curve = new THREE.CatmullRomCurve3(
  POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  true,
  'catmullrom',
  0.5,
)
export const LENGTH = curve.getLength()

export function poseAt(u) {
  const k = ((u % 1) + 1) % 1
  const p = curve.getPointAt(k)
  const t = curve.getTangentAt(k)
  return { x: p.x, z: p.z, tx: t.x, tz: t.z, heading: Math.atan2(t.x, t.z) }
}

export const STOPS = [
  { u: 0.0, name: 'Main Gate' },
  { u: 0.34, name: 'Lake Villas' },
  { u: 0.67, name: 'Spa & Gardens' },
]

export function nextStop(progress) {
  const s = STOPS.find((st) => st.u > progress) ?? STOPS[0]
  const dist = (((s.u - progress) % 1) + 1) % 1 * LENGTH
  return { ...s, dist }
}

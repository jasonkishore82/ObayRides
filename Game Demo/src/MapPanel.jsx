import { useMemo } from 'react'
import { curve, poseAt, STOPS, nextStop } from './route.js'
import { LAKE, LODGE, SPA, POOL, VILLAS, GAZEBO } from './world.js'

const S = 2.7
const mx = (x) => 200 + x * S
const my = (z) => 280 + z * S

export default function MapPanel({ progress, speedKmh }) {
  const route = useMemo(() => {
    const pts = curve.getSpacedPoints(120).slice(0, 120)
    return 'M ' + pts.map((p) => `${mx(p.x).toFixed(1)} ${my(p.z).toFixed(1)}`).join(' L ') + ' Z'
  }, [])

  const pose = poseAt(progress)
  const angle = 180 - (pose.heading * 180) / Math.PI
  const next = nextStop(progress)
  const ms = Math.max(speedKmh / 3.6, 1.5)
  const mins = Math.max(1, Math.round(next.dist / ms / 60))
  const rect = (b, fill, key) => (
    <rect key={key} x={mx(b.x - b.w / 2)} y={my(b.z - b.d / 2)} width={b.w * S} height={b.d * S} fill={fill} rx="2" />
  )

  return (
    <div className="map">
      <svg viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" className="map-svg">
        <rect width="400" height="560" fill="#e8e9ec" />
        {/* greens */}
        <circle cx={mx(0)} cy={my(0)} r={(LAKE.r + 9) * S} fill="#d6e5cf" />
        <rect x="0" y="0" width="400" height="90" fill="#d6e5cf" opacity="0.7" />
        {/* lake and promenade */}
        <circle cx={mx(LAKE.x)} cy={my(LAKE.z)} r={(LAKE.r + 4) * S} fill="#efe9d8" />
        <circle cx={mx(LAKE.x)} cy={my(LAKE.z)} r={LAKE.r * S} fill="#cfe0ee" />
        {/* buildings */}
        {rect(LODGE, '#d0d3d9', 'lodge')}
        {rect(SPA, '#d0d3d9', 'spa')}
        {VILLAS.map((v, i) => rect(v, '#d6d8dd', 'v' + i))}
        <rect x={mx(POOL.x - POOL.w / 2)} y={my(POOL.z - POOL.d / 2)} width={POOL.w * S} height={POOL.d * S} fill="#cfe0ee" rx="2" />
        <circle cx={mx(GAZEBO.x)} cy={my(GAZEBO.z)} r={3.2 * S} fill="#d0d3d9" />
        {/* route road */}
        <path d={route} fill="none" stroke="#c9cbd1" strokeWidth="15" strokeLinejoin="round" />
        <path d={route} fill="none" stroke="#ffffff" strokeWidth="12" strokeLinejoin="round" />
        <path d={route} fill="none" stroke="#2e7dff" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* labels */}
        <text x={mx(LODGE.x)} y={my(LODGE.z) + 4} fontSize="10" textAnchor="middle" fill="#4a4d55" fontFamily="system-ui" fontWeight="700">The Blubay</text>
        <text x={mx(LAKE.x)} y={my(LAKE.z) + 3} fontSize="9" textAnchor="middle" fill="#7a96ad" fontFamily="system-ui">Blubay Lake</text>
        {/* stops */}
        {STOPS.map((s) => {
          const p = poseAt(s.u)
          return (
            <g key={s.name} transform={`translate(${mx(p.x)} ${my(p.z)})`}>
              <circle r="7" fill="#fff" stroke="#2e7dff" strokeWidth="3" />
              <text x="11" y="-6" fontSize="10" fill="#33363d" fontFamily="system-ui" fontWeight="600" stroke="#fff" strokeWidth="3" paintOrder="stroke">{s.name}</text>
            </g>
          )
        })}
        {/* cart arrow */}
        <g transform={`translate(${mx(pose.x)} ${my(pose.z)}) rotate(${angle})`}>
          <circle r="16" fill="#2e7dff" opacity="0.18" />
          <polygon points="0,-12 9,10 0,5 -9,10" fill="#e5392f" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </g>
      </svg>

      <div className="map-top">
        <span>Next: {next.name}</span>
        <span className="map-eta">{mins} min · {(next.dist / 1000).toFixed(2)} km</span>
      </div>

      <div className="map-card">
        <div className="map-search">⌕ Navigate</div>
        <div className="map-speed">{Math.round(speedKmh)}</div>
        <div className="map-unit">km/h</div>
        <svg viewBox="0 0 80 40" className="map-cart">
          <rect x="8" y="16" width="64" height="12" rx="3" fill="#1d2026" />
          <rect x="14" y="6" width="52" height="4" rx="1" fill="#1d2026" />
          <rect x="16" y="10" width="2" height="8" fill="#1d2026" />
          <rect x="62" y="10" width="2" height="8" fill="#1d2026" />
          <circle cx="22" cy="30" r="5" fill="#1d2026" />
          <circle cx="58" cy="30" r="5" fill="#1d2026" />
        </svg>
        <div className="map-dest">{next.name}<br /><small>The Blubay Resort</small></div>
        <div className="map-cancel">Cancel</div>
      </div>

      <div className="map-zoom"><span>+</span><span>−</span></div>
    </div>
  )
}

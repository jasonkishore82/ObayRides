import { useEffect, useRef, useState } from 'react'
import Showroom from './Showroom.jsx'
import ResortSim from './ResortSim.jsx'
import DriveView from './DriveView.jsx'
import MapPanel from './MapPanel.jsx'
import { LENGTH } from './route.js'

const MODES = [
  ['chase', 'Chase'],
  ['aerial', 'Aerial'],
  ['showcase', 'Showcase'],
]
const HINTS = {
  chase: 'Following the cart around The Blubay',
  aerial: 'Drag to orbit · scroll to zoom',
  showcase: 'Drag to orbit · scroll to zoom',
}

export default function App() {
  const [tab, setTab] = useState('map')
  const [mode, setMode] = useState('chase')
  const [progress, setProgress] = useState(0.02)
  const [kmh, setKmh] = useState(0)
  const speed = useRef(0) // m/s, read by the 3D scenes
  const prog = useRef(0.02) // 0..1 along the loop, read by the 3D scene

  useEffect(() => {
    let raf
    let last = performance.now()
    let t = 0
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      const target = 4 + 1.4 * Math.sin(t * 0.5) // ~13-19 km/h
      speed.current += (target - speed.current) * Math.min(1, dt * 1.5)
      prog.current = (prog.current + (speed.current * dt) / LENGTH) % 1
      setProgress(prog.current)
      setKmh(speed.current * 3.6)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="app">
      <section className="stage">
        <div className="brand">OBAY <b>RIDES</b> <span>· The Blubay</span></div>
        <div className="modes">
          {MODES.map(([k, label]) => (
            <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{label}</button>
          ))}
        </div>
        {mode === 'showcase' ? (
          <Showroom speed={speed} />
        ) : (
          <ResortSim key="sim" mode={mode} speed={speed} progress={prog} />
        )}
        <div className="hint">{HINTS[mode]}</div>
      </section>

      <aside className="side">
        <div className="tabs">
          <button className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>Map</button>
          <button className={tab === '3d' ? 'on' : ''} onClick={() => setTab('3d')}>3D</button>
        </div>
        <div className="side-body">
          {tab === 'map' ? (
            <MapPanel progress={progress} speedKmh={kmh} />
          ) : (
            <div className="drive">
              <DriveView speed={speed} />
              <div className="drive-speed">{Math.round(kmh)}<small>km/h</small></div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

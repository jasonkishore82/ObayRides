import { useState } from 'react'
import Live from './Live.jsx'
import Capabilities from './Capabilities.jsx'
import Build from './Build.jsx'

const TABS = [
  ['live', 'Live'],
  ['caps', 'Capabilities'],
  ['build', 'RC Build'],
]

export default function App() {
  const [tab, setTab] = useState('live')
  return (
    <div className="app">
      <nav className="top">
        <div className="logo">OBAY</div>
        <div className="tabs">
          {TABS.map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <div className="top-right">Nav2 · ROS 2</div>
      </nav>
      <main>
        {tab === 'live' && <Live />}
        {tab === 'caps' && <Capabilities />}
        {tab === 'build' && <Build />}
      </main>
    </div>
  )
}

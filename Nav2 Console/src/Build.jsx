import { useState } from 'react'

// Rough Indian street prices (INR), Nov 2026. Unverified: confirm with suppliers.
const TIERS = [
  ['starter', 'Starter', 'Raspberry Pi 5 + 2D LiDAR'],
  ['rec', 'Recommended', 'Jetson Orin Nano + LiDAR + cameras'],
  ['pro', 'Pro', 'Adds depth camera and RTK GPS'],
]

const PARTS = [
  { group: 'Base', part: 'RC car, 1:14 to 1:16 (~30 cm), 4WD, with ESC and steering servo', why: 'Ackermann steering like the real cart', price: [7000, 12000], tiers: ['starter', 'rec', 'pro'] },
  { group: 'Base', part: '2S LiPo 7.4 V × 2 + balance charger', why: 'Drive power, spare for swaps', price: [3000, 5000], tiers: ['starter', 'rec', 'pro'] },
  { group: 'Base', part: '5 V / 5 A buck converter (Jetson: 12 V / 19 V step-up or 3S pack)', why: 'Clean power for the computer', price: [500, 1500], tiers: ['starter', 'rec', 'pro'] },

  { group: 'Compute', part: 'Raspberry Pi 5 (8 GB) + active cooler + 64 GB card', why: 'Runs ROS 2 Jazzy + Nav2 (light)', price: [9500, 12000], tiers: ['starter'] },
  { group: 'Compute', part: 'NVIDIA Jetson Orin Nano Super dev kit (8 GB) + NVMe SSD', why: 'Nav2 + camera AI (people detection)', price: [30000, 43000], tiers: ['rec', 'pro'] },

  { group: 'Sensors', part: '2D 360° LiDAR (RPLIDAR C1 / LD19 class, ~12 m)', why: 'Costmap, SLAM, AMCL, collision monitor', price: [7000, 9500], tiers: ['starter', 'rec', 'pro'] },
  { group: 'Sensors', part: 'Camera: Pi Camera Module 3', why: 'Remote view, basic vision', price: [2500, 3500], tiers: ['starter'] },
  { group: 'Sensors', part: 'Cameras: 2 × wide-angle CSI/USB (front + rear)', why: 'Person detection, remote monitoring', price: [4000, 8000], tiers: ['rec', 'pro'] },
  { group: 'Sensors', part: 'Depth camera (OAK-D Lite class)', why: '3D obstacles for the voxel layer', price: [14000, 20000], tiers: ['pro'] },
  { group: 'Sensors', part: 'IMU: MPU6050', why: 'Heading for odometry fusion', price: [200, 400], tiers: ['starter'] },
  { group: 'Sensors', part: 'IMU: BNO085 (9-axis, fused)', why: 'Better heading, less drift', price: [1800, 3000], tiers: ['rec', 'pro'] },
  { group: 'Sensors', part: 'Wheel / motor encoder (hall sensor)', why: 'Odometry for robot_localization', price: [500, 1500], tiers: ['starter', 'rec', 'pro'] },
  { group: 'Sensors', part: 'Ultrasonic × 4 (HC-SR04 class)', why: 'Close-range bumper backup', price: [300, 600], tiers: ['starter', 'rec'] },
  { group: 'Sensors', part: 'RTK GNSS (u-blox ZED-F9P class) + antenna', why: 'cm-level GPS outdoors, same as full-size plan', price: [20000, 28000], tiers: ['pro'] },

  { group: 'Control', part: 'ESP32 / Arduino (micro-ROS) + PCA9685 PWM board', why: 'Turns cmd_vel into servo + ESC signals', price: [900, 1500], tiers: ['starter', 'rec', 'pro'] },
  { group: 'Control', part: 'RC transmitter channel kill switch / relay E-stop', why: 'Manual override and emergency stop', price: [500, 1200], tiers: ['starter', 'rec', 'pro'] },

  { group: 'Build', part: 'Sensor deck: 3D-printed / acrylic plate, standoffs, wiring, connectors', why: 'Mount everything rigidly', price: [1500, 3000], tiers: ['starter', 'rec', 'pro'] },
]

const PHASES = [
  ['1–2 wk', 'Assemble', 'Mount deck, wire power, PWM board and E-stop. Drive by RC to check steering and ESC.'],
  ['1–2 wk', 'ROS 2 + drivers', 'Install Ubuntu + ROS 2, LiDAR driver, micro-ROS bridge, teleop from a laptop, odometry from encoder + IMU.'],
  ['1–2 wk', 'Map + localize', 'Map a test course with slam_toolbox. Localize with AMCL; fuse odometry with robot_localization.'],
  ['2–3 wk', 'Nav2 tuning', 'Smac Hybrid-A* (turning radius), Regulated Pure Pursuit, collision monitor, keepout and speed masks.'],
  ['1 wk', 'Mini resort demo', 'Cones and boxes as buildings, 3–4 stops, waypoint patrol, pedestrians crossing. Connect this console via rosbridge.'],
]

const STACK = [
  ['OS', 'Ubuntu 24.04 + ROS 2 Jazzy on Pi 5 · JetPack 6 (Ubuntu 22.04) + ROS 2 Humble on Jetson'],
  ['Drivers', 'sllidar_ros2 / ldlidar driver, camera driver, micro-ROS agent for the ESP32'],
  ['Localization', 'slam_toolbox (mapping), nav2_amcl, robot_localization (IMU + wheel odometry, GPS on Pro)'],
  ['Navigation', 'Nav2: Smac Hybrid-A*, Regulated Pure Pursuit (or MPPI Ackermann), velocity smoother, collision monitor, waypoint follower, keepout + speed filters'],
  ['UI', 'rosbridge_server → this console (Live tab → Connect)'],
]

const inr = (n) => '₹' + n.toLocaleString('en-IN')

export default function Build() {
  const [tier, setTier] = useState('rec')
  const rows = PARTS.filter((p) => p.tiers.includes(tier))
  const lo = rows.reduce((a, p) => a + p.price[0], 0)
  const hi = rows.reduce((a, p) => a + p.price[1], 0)
  const all = TIERS.map(([k]) => {
    const r = PARTS.filter((p) => p.tiers.includes(k))
    return [k, r.reduce((a, p) => a + p.price[0], 0), r.reduce((a, p) => a + p.price[1], 0)]
  })

  return (
    <div className="page">
      <header className="page-head">
        <h1>Nav2 on a 1-foot RC car</h1>
        <p>A ~30 cm (1:14 to 1:16) RC car, semi-built: keep the chassis, motor, ESC and steering servo, and add compute, sensors and a control bridge. It has Ackermann steering like the golf cart, so the same Nav2 setup carries over.</p>
      </header>

      <div className="tiers">
        {TIERS.map(([k, name, sub]) => {
          const [, a, b] = all.find((t) => t[0] === k)
          return (
            <button key={k} className={tier === k ? 'on' : ''} onClick={() => setTier(k)}>
              <span className="tier-name">{name}</span>
              <span className="tier-price">{inr(Math.round(a / 1000) * 1000)} – {inr(Math.round(b / 1000) * 1000)}</span>
              <span className="tier-sub">{sub}</span>
            </button>
          )
        })}
      </div>

      <section className="bom">
        <div className="bom-head">
          <h2>Parts list</h2>
          <div className="bom-total">{inr(lo)} – {inr(hi)}</div>
        </div>
        <table>
          <thead>
            <tr><th>Part</th><th>Why</th><th className="num">Estimate</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.part}>
                <td><span className="grp">{p.group}</span>{p.part}</td>
                <td className="why">{p.why}</td>
                <td className="num">{inr(p.price[0])} – {inr(p.price[1])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">Rough Indian retail prices, not supplier quotes. Add ₹2,000–5,000 for tools if you don&apos;t have them (soldering iron, multimeter, 3D-print access) and 10–15% for shipping and spares.</p>
      </section>

      <section>
        <h2>How it connects</h2>
        <div className="flow">
          <div className="box"><b>Sensors</b><span>LiDAR · camera · IMU · encoder{tier === 'pro' ? ' · depth · RTK' : ''}</span></div>
          <div className="arrow">→</div>
          <div className="box dark"><b>{tier === 'starter' ? 'Raspberry Pi 5' : 'Jetson Orin Nano'}</b><span>ROS 2 + Nav2 → cmd_vel</span></div>
          <div className="arrow">→</div>
          <div className="box"><b>ESP32 bridge</b><span>micro-ROS · PWM</span></div>
          <div className="arrow">→</div>
          <div className="box"><b>ESC + servo</b><span>throttle · steering</span></div>
        </div>
        <div className="flow sub">
          <div className="box red"><b>RC transmitter</b><span>manual override · E-stop</span></div>
          <div className="arrow">→</div>
          <div className="box"><b>ESP32 bridge</b><span>override always wins</span></div>
          <div className="spacer" />
          <div className="box"><b>This console</b><span>rosbridge over Wi-Fi</span></div>
        </div>
      </section>

      <section>
        <h2>Software stack</h2>
        <dl className="stack">
          {STACK.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </section>

      <section>
        <h2>Timeline · about 6–10 weeks part-time</h2>
        <ol className="phases">
          {PHASES.map(([t, name, d]) => (
            <li key={name}><span className="ph-t">{t}</span><b>{name}</b><p>{d}</p></li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Things to know</h2>
        <ul className="notes">
          <li><b>Size.</b> A 30 cm car fits a Pi 5 and a C1-class LiDAR comfortably. A Jetson kit (~100 × 80 mm plus heatsink) fits but is top-heavy; a 1:10 car (~40–50 cm) is easier if you go Recommended or Pro.</li>
          <li><b>Steering.</b> Use Smac Hybrid-A* or Lattice with the car&apos;s real turning radius. Spin and Rotation Shim won&apos;t work on Ackermann.</li>
          <li><b>Speed.</b> Cap it at walking pace (~1 m/s) while tuning; a small car at full RC speed outruns a 10 Hz LiDAR.</li>
          <li><b>GPS.</b> Plain GPS (2–5 m error) is useless at this scale. Use LiDAR + AMCL; RTK only makes sense outdoors on the Pro build.</li>
          <li><b>Why bother.</b> It proves the full Nav2 setup (maps, filters, monitor, waypoints, rosbridge UI) for about 1% of the ₹5–10 lakh full-size prototype.</li>
        </ul>
      </section>
    </div>
  )
}

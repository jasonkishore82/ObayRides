// Minimal rosbridge (rosbridge_suite) client over a plain WebSocket.
// Real Nav2: `ros2 launch rosbridge_server rosbridge_websocket_launch.xml` then connect to ws://<host>:9090.

export function connectRos(url, { onPose, onPlan, onStatus }) {
  let ws
  try {
    ws = new WebSocket(url)
  } catch {
    onStatus('error')
    return null
  }
  const send = (o) => ws.readyState === 1 && ws.send(JSON.stringify(o))

  ws.onopen = () => {
    onStatus('connected')
    send({ op: 'subscribe', topic: '/amcl_pose', type: 'geometry_msgs/msg/PoseWithCovarianceStamped' })
    send({ op: 'subscribe', topic: '/plan', type: 'nav_msgs/msg/Path' })
    send({ op: 'advertise', topic: '/goal_pose', type: 'geometry_msgs/msg/PoseStamped' })
  }
  ws.onmessage = (e) => {
    let m
    try { m = JSON.parse(e.data) } catch { return }
    if (m.op !== 'publish') return
    if (m.topic === '/amcl_pose') {
      const p = m.msg.pose.pose
      const q = p.orientation
      const yaw = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))
      onPose({ x: p.position.x, y: p.position.y, yaw })
    }
    if (m.topic === '/plan') onPlan(m.msg.poses.map((s) => [s.pose.position.x, s.pose.position.y]))
  }
  ws.onerror = () => onStatus('error')
  ws.onclose = () => onStatus('off')

  return {
    sendGoal(x, y) {
      send({
        op: 'publish',
        topic: '/goal_pose',
        msg: { header: { frame_id: 'map' }, pose: { position: { x, y, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } },
      })
    },
    close() { ws.close() },
  }
}

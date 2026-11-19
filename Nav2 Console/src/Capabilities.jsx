import { useState } from 'react'

// Every package in the Nav2 repo (ros-navigation/navigation2, main), grouped by job.
const GROUPS = [
  {
    name: 'Navigate',
    items: [
      { pkg: 'nav2_bt_navigator', title: 'BT Navigator', what: 'Runs NavigateToPose and NavigateThroughPoses as behavior trees: plan, follow, recover, repeat.', obay: '"Drive to the next stop" becomes one action call from the app.', live: 'Behavior tree log' },
      { pkg: 'nav2_behavior_tree', title: 'Behavior tree nodes', what: 'Library of BT nodes: ComputePathToPose, FollowPath, recovery fallbacks, rate and goal-updated decorators, battery and time conditions.', obay: 'Add custom nodes like "wait until all seats are occupied".', live: 'Behavior tree log' },
      { pkg: 'nav2_waypoint_follower', title: 'Waypoint Follower', what: 'Visits an ordered list of poses, with a task executor at each one (pause, photo, input).', obay: 'The fixed tourist loop with a dwell at every stop.', live: 'Waypoints' },
      { pkg: 'nav2_route', title: 'Route Server', what: 'Plans over a pre-defined route graph of nodes and edges instead of free space, with edge costs and per-edge operations.', obay: 'Keep carts exactly on the paved resort paths; mark one-way or closed paths.' },
      { pkg: 'nav2_simple_commander', title: 'Simple Commander', what: 'Python API: goToPose(), followWaypoints(), dock(), plus task status and cancel.', obay: 'The ride backend turns a booking into a goal in a few lines.' },
      { pkg: 'nav2_docking', title: 'Docking Server', what: 'Precise auto-docking to chargers or stations using a dock database and detected markers.', obay: 'Return to the charging bay overnight without staff.' },
      { pkg: 'nav2_following', title: 'Following Server', what: 'Follows a detected dynamic object, such as a person, at a set distance.', obay: '"Follow-me" mode for staff moving a cart or a walking tour guide.' },
    ],
  },
  {
    name: 'Plan',
    items: [
      { pkg: 'nav2_planner', title: 'Planner Server', what: 'Hosts planner plugins and returns a global path on the costmap.', obay: 'Route from wherever the cart is to the booked stop.', live: 'Global plan' },
      { pkg: 'nav2_smac_planner', title: 'Smac Planners', what: '2D A*, Hybrid-A* (respects a minimum turning radius) and State Lattice.', obay: 'Hybrid-A* or Lattice for car-like steering: golf carts and RC cars cannot turn on the spot.', live: 'Global plan' },
      { pkg: 'nav2_navfn_planner', title: 'NavFn', what: 'Classic Dijkstra / A* wavefront planner. Fast and simple for round or diff-drive robots.', obay: 'Quick baseline while tuning maps.' },
      { pkg: 'nav2_theta_star_planner', title: 'Theta*', what: 'Any-angle planner that produces straighter paths in open areas.', obay: 'Lawns and plazas where grid zig-zags look odd.' },
      { pkg: 'nav2_smoother', title: 'Smoother Server', what: 'Smooths raw plans (simple, Savitzky-Golay) without leaving free space.', obay: 'Gentler curves for passenger comfort.', live: 'Global plan' },
      { pkg: 'nav2_constrained_smoother', title: 'Constrained Smoother', what: 'Optimises the path for curvature limits and obstacle distance.', obay: 'Keeps paths within the cart\'s steering limits.' },
    ],
  },
  {
    name: 'Control',
    items: [
      { pkg: 'nav2_controller', title: 'Controller Server', what: 'Runs the path-tracking plugin at ~20 Hz and outputs cmd_vel. Also checks progress and goal tolerance.', obay: 'The loop that actually steers and drives.', live: 'Local controller' },
      { pkg: 'nav2_regulated_pure_pursuit_controller', title: 'Regulated Pure Pursuit', what: 'Pure pursuit that slows down on tight curves and near obstacles.', obay: 'Best first choice for a slow cart on fixed paths.', live: 'Local controller' },
      { pkg: 'nav2_mppi_controller', title: 'MPPI', what: 'Sampling-based predictive control with an Ackermann motion model and many critics.', obay: 'Upgrade for crowded areas and smoother dynamic avoidance.' },
      { pkg: 'nav2_dwb_controller', title: 'DWB', what: 'Dynamic Window Approach with pluggable trajectory critics.', obay: 'Classic option; very tunable.' },
      { pkg: 'nav2_graceful_controller', title: 'Graceful Controller', what: 'Smooth, exponentially stable control law toward a moving motion target.', obay: 'Smooth final approach to a stop or dock.' },
      { pkg: 'nav2_rotation_shim_controller', title: 'Rotation Shim', what: 'Rotates in place toward the path before handing off to the main controller.', obay: 'Not useful for Ackermann vehicles, which cannot rotate in place.' },
      { pkg: 'nav2_velocity_smoother', title: 'Velocity Smoother', what: 'Limits acceleration and jerk on cmd_vel; adds deadbands and timeouts.', obay: 'No sudden jolts for passengers.', live: 'Local controller' },
      { pkg: 'nav2_collision_monitor', title: 'Collision Monitor', what: 'Safety layer on raw sensor data with stop, slowdown and approach polygons, independent of the planners.', obay: 'Emergency braking when a guest steps out.', live: 'Collision monitor' },
    ],
  },
  {
    name: 'Perceive & map',
    items: [
      { pkg: 'nav2_costmap_2d', title: 'Costmap 2D', what: 'Layered grid: static, obstacle, voxel, range (sonar), inflation, asymmetric inflation and denoise layers.', obay: 'One picture of where the cart may drive, updated from LiDAR, cameras and sonar.', live: 'Costmap · inflation' },
      { pkg: 'costmap filters', title: 'Costmap filters', what: 'Keepout, speed limit, binary (switch something on/off in a zone) and zone-parameter filters, driven by mask maps.', obay: 'Geofence, slow zones near pools, staff-only no-go areas.', live: 'Keepout & speed filters' },
      { pkg: 'nav2_voxel_grid', title: 'Voxel grid', what: '3D occupancy for depth cameras and 3D LiDAR.', obay: 'Catch overhanging branches and low barriers a 2D scan misses.' },
      { pkg: 'nav2_map_server', title: 'Map Server', what: 'Loads and saves occupancy maps and filter masks.', obay: 'One saved map per resort site.' },
      { pkg: 'nav2_amcl', title: 'AMCL', what: 'Particle-filter localization against a 2D map using LiDAR.', obay: 'Indoors and on the RC car. Outdoors, fuse GPS with robot_localization.' },
    ],
  },
  {
    name: 'Recover',
    items: [
      { pkg: 'nav2_behaviors', title: 'Behavior Server', what: 'Spin, BackUp, DriveOnHeading, Wait and AssistedTeleop recovery behaviors.', obay: 'Wait when a guest blocks the path; AssistedTeleop for a remote operator.', live: 'Behavior tree log' },
    ],
  },
  {
    name: 'System & tools',
    items: [
      { pkg: 'nav2_lifecycle_manager', title: 'Lifecycle Manager', what: 'Starts, stops and supervises all servers in order, with heartbeats.', obay: 'Safe startup and shutdown of the whole stack.' },
      { pkg: 'nav2_bringup', title: 'Bringup', what: 'Launch files and example parameters to start everything.', obay: 'Starting point for the cart\'s config.' },
      { pkg: 'nav2_loopback_sim', title: 'Loopback Sim', what: 'Frictionless "perfect odometry" simulator that replaces hardware for testing.', obay: 'Test behavior trees on a laptop before touching a cart.' },
      { pkg: 'nav2_rviz_plugins', title: 'RViz plugins', what: 'Panels to send goals and waypoints and watch Nav2 state.', obay: 'Engineering tool alongside this console.' },
      { pkg: 'nav2_system_tests', title: 'System tests', what: 'Integration tests for the full stack.', obay: 'Regression checks before each site rollout.' },
      { pkg: 'core libraries', title: 'Core libraries', what: 'nav2_core, nav2_msgs, nav2_util, nav2_common, nav2_ros_common: plugin interfaces, messages and helpers.', obay: 'Used when writing custom plugins.' },
    ],
  },
]

export default function Capabilities() {
  const [group, setGroup] = useState('All')
  const shown = group === 'All' ? GROUPS : GROUPS.filter((g) => g.name === group)
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="page">
      <header className="page-head">
        <h1>What Nav2 can do</h1>
        <p>All {total} building blocks in the Nav2 repo, what each does, and how it would serve an Obay cart. Items marked <span className="chip-live">Live</span> are shown in the Live view.</p>
      </header>
      <div className="chips">
        {['All', ...GROUPS.map((g) => g.name)].map((n) => (
          <button key={n} className={group === n ? 'on' : ''} onClick={() => setGroup(n)}>{n}</button>
        ))}
      </div>
      {shown.map((g) => (
        <section key={g.name} className="cap-group">
          <h2>{g.name}</h2>
          <div className="cards">
            {g.items.map((it) => (
              <article key={it.pkg} className="card">
                <div className="card-top">
                  <code>{it.pkg}</code>
                  {it.live && <span className="chip-live" title={`Layer: ${it.live}`}>Live</span>}
                </div>
                <h3>{it.title}</h3>
                <p>{it.what}</p>
                <p className="obay"><b>For Obay</b> {it.obay}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

# R&D: Third-Party Repos

Open-source projects evaluated for Obay Rides (autonomous electric golf cart for tourism: low speed, geofenced routes, private land, small budget).

> URLs and licenses are from memory. Verify them and check recent activity before depending on any project.

## 1. Cloned locally

Ranked by fit for our use case. Nav2 (`Nav2/`) and Autoware (`Autoware/`) are git submodules: the repo stores only the URL and a pinned commit, so run `git submodule update --init --depth 1` after cloning to fetch them. CARLA stays in `third_party/carla`, which is git-ignored and not pushed.

| Rank | Repo | URL | License | Notes |
|---|---|---|---|---|
| 1 | navigation2 (Nav2) | https://github.com/ros-navigation/navigation2 | Apache 2.0 | Best for the prototype: waypoint navigation and obstacle avoidance for slow vehicles. |
| 2 | autoware | https://github.com/autowarefoundation/autoware | Apache 2.0 | Best long-term stack. The cloned repo is only the meta-repo; the code lives in `autoware_universe` and related repos. |
| 3 | carla | https://github.com/carla-simulator/carla | MIT (code) | Simulator for testing. Western roads, so a testing tool, not part of the product. |

## 2. Removed (re-clone if needed)

Deleted from disk to save about 3.8 GB.

| Repo | URL | License | Why removed |
|---|---|---|---|
| apollo | https://github.com/ApolloAuto/apollo | Apache 2.0 | Built for road cars, heaviest setup, adds little over Autoware for a cart. (~2.0 GB) |
| openpilot | https://github.com/commaai/openpilot | MIT | Driver assist for supported production cars; not driverless, won't control a golf cart. (~1.8 GB) |

Re-clone with `git clone --depth 1 <url>`.

## 3. Worth adding (not cloned yet)

| Priority | Project | URL | Use |
|---|---|---|---|
| High | ROS 2 (Humble or Jazzy) | https://github.com/ros2/ros2 (docs: https://docs.ros.org) | Base platform for Nav2 and Autoware |
| High | robot_localization | https://github.com/cra-ros-pkg/robot_localization | Fuses GPS, IMU and wheel odometry into one position |
| High | Gazebo (gz-sim) | https://github.com/gazebosim/gz-sim | Lightweight simulator for a custom resort map |
| Medium | Eclipse Mosquitto (MQTT) | https://github.com/eclipse-mosquitto/mosquitto | Cart-to-cloud messaging for the app |
| Medium | Flutter | https://github.com/flutter/flutter | Passenger app |
| Medium | React Native | https://github.com/facebook/react-native | Passenger app (alternative to Flutter) |
| Medium | Ultralytics YOLO | https://github.com/ultralytics/ultralytics | Detecting people and animals. **AGPL**: check licensing before commercial use. |
| Medium | YOLOX | https://github.com/Megvii-BaseDetection/YOLOX | Detection alternative (Apache 2.0) |
| Low | Lanelet2 | https://github.com/fzi-forschungszentrum-informatik/Lanelet2 | Map format for routes, mainly if using Autoware |
| Low | OpenStreetMap (data and tools) | https://github.com/openstreetmap/openstreetmap-website | Source map data for sites |

## 4. Suggested order

1. Start with **ROS 2 + Nav2** and test in **Gazebo**.
2. Add **robot_localization** (GPS/IMU fusion) and obstacle detection.
3. Move to **Autoware** only if Nav2 can't handle the site or you need its full perception and planning.
4. Treat **CARLA** as optional; **Apollo** and **openpilot** are reference only.

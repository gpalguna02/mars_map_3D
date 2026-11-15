# SOL NAV // 3D Martian Surface EVA Navigator & Global Planetary Map

[![Version](https://img.shields.io/badge/version-2.4.0--mission--ready-red.svg)](https://github.com/gpalguna02/mars_map_3D)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688.svg)](http://localhost:8000)
[![React](https://img.shields.io/badge/frontend-React%2018%20%7C%20Three.js-61DAFB.svg)](http://localhost:5173)
[![Status](https://img.shields.io/badge/deployment-100%25%20operational-success.svg)](http://localhost:5173)

**Sol Nav** is a mission-grade, interactive 3D web application and planetary geospatial information system (GIS) engineered for Martian surface Extravehicular Activity (EVA) navigation, astronaut pathfinding, global DEM terrain exploration, and multi-agent expedition tracking.

---

## 🌐 Live System URLs

| Interface / Service | Local Port | Direct URL | Description |
| :--- | :--- | :--- | :--- |
| **Tactical 3D EVA Navigator** | `5173` | [http://localhost:5173](http://localhost:5173) | High-resolution 3D sector DEM with walking 3D astronauts, companion rover mule, 3rd-person Chase Cam, A* elevation routing, and AlaSQL terminal. |
| **Global Planetary Map Hub** | `8000` | [http://localhost:8000](http://localhost:8000) | USGS MOLA 3D Mars globe, 2D equirectangular projection, live planetary expedition fleets, Earth vs Mars comparison, and Worldview timeline. |
| **Mission Telemetry API** | `3001` | [http://localhost:3001](http://localhost:3001) | Relational telemetry database, waypoint logging, and hazard boundary queries. |

---

## 👨‍🚀 Animated 3D Traversal & Third-Person Chase Cam

In the **Tactical 3D EVA Navigator** (`http://localhost:5173`), users can deploy an animated expedition team directly onto the Martian surface:

1. **Procedural Articulated Crew**:
   - **Commander Vance (CDR)**: NASA EVA suit with orange command markings, reflective gold helmet visor, chest searchlight spot beam, and blinking emergency life-support PLSS beacon.
   - **Dr. Chen (SCI)**: Cyan science trim astronaut walking in synchronized flank formation.
   - **Rover Companion (Mule)**: Autonomous 4-wheel rover vehicle with rotating chassis wheels, sensor mast, and solar battery module.
2. **Dynamic Ground-Locking**:
   - Real-time elevation calculation locks boots and wheels directly to the undulating dunes, crater slopes, and boulder fields.
3. **Floating Holographic HUD Badges**:
   - Live heart rate (BPM) and O₂ supply reserve percentages displayed above each crew member.
4. **Third-Person Chase Cam 🎥**:
   - Click the camera icon or toggle `Chase Cam` in the traversal dock to enter an immersive over-the-shoulder third-person camera following CDR Vance, Dr. Chen, or the Rover Mule across Mars.
5. **Speed Controller**:
   - Traversal speed toggleable between `1x`, `2x`, and `4x` with instant Play / Pause controls.

---

## 🌟 Key Features & Subsystems

### 1. High-Fidelity 3D Martian Surface Sectors
* **Jezero Crater Delta**: Ancient paleolake delta fan, layered clay deposits, and steep impact crater rim escarpments (Perseverance rover landing site).
* **Gale Crater & Mount Sharp**: Central Aeolis Mons rising 5.5 km above the crater floor with sulfate strata (Curiosity rover site).
* **Olympus Mons Caldera Rim**: 6–8 km vertical drop lava cliff scarps and shield caldera steps.
* **Valles Marineris Chasma**: 7 km deep tectonic fracture canyon, layered bedrock, and scree slopes.

### 2. Martian Solar Day Simulation
* **Sol Time Controller**: Real-time slider from `00:00` to `24:39 MTC` (Martian Coordinated Time).
* **Atmospheric Scattering**: Dynamic butterscotch midday haze, deep ultraviolet dusk halos, and starry cosmos at night.
* **Solar Irradiance**: Real-time shadow casting and Watt/m² solar exposure calculation along traverses.

### 3. A* Elevation Pathfinding & Route Optimization
* **Waypoints**: Drop Base Camp Alpha, Target Objective, and intermediate waypoints with raycasting clicks.
* **A* Safety Scoring**: Elevation algorithm penalizes steep slopes (>15°) and hazardous terrain.
* **Elevation Profile Graph**: 2D cross-section SVG displaying distance (km), height (m), and color-coded slope gradients (<8° safe cyan, 8°–15° amber, >15° danger red).

### 4. Global Planetary GIS & Live Fleets (`http://localhost:8000`)
* **Dual View Modes**: Switch seamlessly between full-screen **3D Mars Globe** and **2D Equirectangular Map**.
* **Live Planetary Fleets**:
  - `👨‍🚀 EVA Team Alpha`: Jezero Crater delta survey traverse.
  - `👩‍🚀 Ground Recon Beta`: Gale Crater / Mount Sharp ascent.
  - `🚀 Caldera High-Altitude Unit`: Olympus Mons summit caldera rim patrol.
* **USGS Scientific Layers**: Toggle true-color optical imagery, MOLA topographic hypsometry, THEMIS thermal inertia, and CRISM hydrated mineralogy.
* **Earth vs Mars Comparison**: Interactive overlay comparing planetary radius, surface area, gravity, atmosphere pressure, and day length.
* **NASA Worldview Timeline**: Historical MOLA and Mars Global Surveyor time-lapse slider.
* **Turn-by-Turn Navigation**: Real-time azimuth bearings, distance readouts, and waypoint guidance.
* **Data Export**: 1-click export of routes to standard **GPX** and **GeoJSON** formats.

### 5. In-Browser AlaSQL Console
* Run mission SQL queries directly against spatial database tables:
  ```sql
  SELECT * FROM hazards WHERE type = 'dust_storm' OR severity = 'critical';
  SELECT * FROM safe_zones WHERE radius_km >= 2.5;
  SELECT * FROM scientific_samples WHERE mineral = 'hydrated_silica';
  SELECT * FROM comms_relays WHERE frequency_ghz >= 8.0;
  ```
* Any query returning `(x, z)` coordinates instantly projects glowing 3D beacon markers on the terrain!

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- PowerShell (Windows) or Bash (macOS/Linux)

### Installation & Launch

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gpalguna02/mars_map_3D.git
   cd mars_map_3D
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install Python dependencies**:
   ```bash
   pip install fastapi uvicorn numpy requests scipy
   ```

4. **Launch all services**:
   ```bash
   # Terminal 1 - Node.js Mission Control Telemetry (Port 3001)
   node server.js

   # Terminal 2 - Python FastAPI Global GIS Engine (Port 8000)
   python main.py

   # Terminal 3 - React Vite Tactical EVA Navigator (Port 5173)
   npm run dev
   ```

5. Open your web browser to:
   - **Tactical 3D Navigator & Astronauts**: `http://localhost:5173`
   - **Global 3D/2D Planetary Map**: `http://localhost:8000`

---

## 🎮 User Navigation Guide

### In the Tactical 3D Navigator (`http://localhost:5173`):
- **Orbit Camera**: Left-click and drag across the Martian soil.
- **Pan Camera**: Right-click and drag (or two-finger drag).
- **Zoom In/Out**: Mouse scroll wheel or pinch to zoom.
- **Track Astronauts**: Click **Chase Cam** in the expedition dock to follow CDR Vance in third-person view.
- **Switch Crew Member**: Use the dropdown in the bottom traversal dock to toggle between `Commander Vance`, `Dr. Chen`, or `Rover Mule`.
- **Set Waypoints**: Click `Set Base` or `Set Target`, then click any spot on the terrain.
- **Execute SQL**: Click `SQL Console` on the left HUD, choose a preset query or type your own, and click `RUN`.

### In the Global Planetary Map (`http://localhost:8000`):
- **Switch 3D / 2D**: Click `🌐 3D` or `🗺️ 2D` in the top floating dock.
- **Compare with Earth**: Click `🌍 Compare` to open the side-by-side Earth vs Mars physical metrics dialog.
- **Search Features**: Type `Olympus`, `Jezero`, `Gale`, or `Valles` into the search box to smoothly fly the camera to that landmark.
- **Toggle Layers**: Use the GIS Hub sidebar on the left to toggle Topography, Thermal, Dust Hazards, and Mineralogy.
- **Export Data**: In the Route Planning sidebar on the right, click `Export GPX` or `Export GeoJSON` to save your mission path.

---

## 🛡️ License
Licensed under the MIT License. Developed for NASA Mars exploration research and interactive planetary education.

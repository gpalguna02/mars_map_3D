# SOL NAV // 3D Martian Surface EVA Navigator

**Sol Nav** is a mission-grade, interactive 3D web application engineered for Martian surface Extravehicular Activity (EVA) navigation, astronaut pathfinding, and planetary geological exploration.

Built with **React**, **Three.js**, **Tailwind CSS**, and **AlaSQL**, it models the terrain of iconic Martian impact basins, volcanic calderas, and chasma networks with Digital Elevation Models (DEM) and scientific dataset overlays.

---

## 🌟 Key Subsystems & Features

### 1. High-Fidelity 3D Martian Surface Environment
* **Martian Sectors**:
  - **Jezero Crater Delta**: Ancient paleolake delta fan, layered clay deposits, and steep impact crater rim escarpments (Perseverance rover site).
  - **Gale Crater & Mount Sharp**: Central Aeolis Mons rising 5.5 km above the crater floor with sulfate strata (Curiosity rover site).
  - **Olympus Mons Caldera Rim**: 6-8 km vertical drop lava cliff scarps and shield caldera steps.
  - **Valles Marineris Chasma**: 7 km deep tectonic fracture canyon, layered bedrock, and scree slopes.
* **Photorealistic Dynamic Lighting & Martian Sol Day Simulation**:
  - Sol time controller slider from **00:00 to 24:39 MTC** (Martian Solar Time).
  - Real-time solar azimuth and elevation calculation based on Martian latitude and solar declination.
  - Realistic atmospheric scattering: warm butterscotch sky at noon, blue twilight halos at dawn and dusk, and deep space starfields at night.
  - Dynamic shadow casting and crater shadow calculation.

### 2. Granular Navigation & Route Planning (The EVA Navigator)
* **Point-to-Point Routing**: Drop "Start" (Base Camp Alpha), "End" (Target Objective), and intermediate Waypoints directly on the 3D terrain via raycasting.
* **Safe Path Calculation (A* Algorithm)**: Computes safest path on the DEM elevation grid, heavily penalizing steep slopes (>15°) and hazardous cells.
* **Traverse Modes**:
  - 🥾 **EVA Astronaut Suit (Foot Walk)**: 2.8 km/h base speed, maximum safe incline ~22°, metabolic O₂ consumption rate modeled against slope gradient.
  - 🚙 **Pressurized Rover (Drivable Vehicle)**: 7.5 km/h base speed, maximum safe incline ~15°, power consumption modeled with solar panel regenerative recharging.
* **2D Cross-Section Elevation Profiling**:
  - Interactive SVG cross-section graph at the bottom showing cumulative distance (km), height (m), and gradient slopes.
  - Slopes <8° in **Cyan** (Safe), 8°-15° in **Amber** (Moderate), and >15° highlighted in **Red** (Critical Incline).
  - Synchronized hover indicator: moving mouse over the profile highlights the exact 3D position on the Martian terrain.

### 3. Multi-Layered Scientific Datasets (Left Sidebar HUD)
* 👁️ **Optical Layer**: True-color visible imagery calibrated to HiRISE / MOLA reflectance with basaltic sand depressions and rock scatter.
* 🏔️ **Topographic Layer (DEM)**: Hypsometric color-ramp (-4,500m to +3,200m) with 50m interval isohypse contour lines.
* 🔥 **Thermal Infrared (THEMIS)**: Surface temperature gradient from 140 K (-133°C cold traps) to 280 K (+7°C sun-baked rock faces).
* ✨ **Spectral Mineralogy (CRISM)**: Identifies hydrated clays/subsurface ice (neon cyan), iron oxide hematite (rust red), pyroxene basalt (dark violet), and gypsum sulfates (amber).
* 🌪️ **Atmospheric & Dust**: Animated dust storm vortex shaders, atmospheric opacity (optical depth $\tau$), and aeolian wind flow vectors.

### 4. Built-In Glassmorphic SQL Console & 3D Spatial Plotting
* **AlaSQL In-Browser Relational Engine**:
  - Pre-seeded tables: `hazards`, `safe_zones`, `scientific_samples`, `comms_relays`, `eva_crews`, `rovers`.
  - Supports standard SQL:
    ```sql
    SELECT * FROM hazards WHERE type='dust_storm' OR severity='critical';
    SELECT * FROM safe_zones WHERE radius_km >= 2.5;
    SELECT * FROM scientific_samples WHERE mineral='hydrated_silica';
    SELECT * FROM comms_relays WHERE frequency_ghz >= 8.0;
    ```
* **Instant 3D Marker Feedback**: Any query returning coordinates `(x, z)` automatically plots glowing 3D beacons with radar pulse halos directly on the 3D Martian terrain!

### 5. Advanced Mission Features
* 📡 **Line-of-Sight (LOS) Comms Raycasting**: Samples ray path from Base Camp's 25m comm mast to the astronaut traverse. Green beam for direct radio contact; glowing red dashed beam when occluded by mountain or crater walls.
* ☀️ **Solar Irradiance & Shadow Tracking**: Computes local surface flux ($W/m^2$) along the route, warning astronauts if they enter perpetual shadow cold-traps.
* 🚨 **Hazard Proximity Emergency Alerts**: Real-time HUD banner flashing with NASA Apollo-style audio alarm when a drawn route approaches cliff escarpments, active dust storm cells, or soft sand sinks.
* 🎧 **Web Audio Telemetry Synthesizer**: Synthesizes UI clicks, query execution blips, route completion chimes, and master alarms without external audio files.
* 💾 **GeoJSON / Mission Manifest Export**: Exports full route telemetry, waypoints, and path coordinate arrays to a downloadable JSON file.

---

## 🚀 Quick Start Instructions

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Starting the Application
From the project folder:
```bash
cd sol-nav
npm run dev
```

Open your browser to:
```
http://localhost:5173
```

---

## 🗺️ How to Plan an EVA Route
1. Select an operational sector from the top navbar (e.g., **Jezero Crater Delta**).
2. Click **SET BASE** in the right-hand panel, then click on the 3D Martian surface to place Base Camp Alpha.
3. Click **SET TARGET**, then click elsewhere on the terrain to place your destination objective.
4. Click **+ WAYPOINT** to add intermediate navigational points around hazardous craters or cliffs.
5. Click **CALCULATE SAFE ROUTE**: Sol Nav will run the A* elevation pathfinding algorithm, render the 3D path ribbon, and draw the 2D elevation cross-section graph!

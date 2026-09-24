# Final UI Design Notes

## The "Apple × NASA" Aesthetic
The interface has been meticulously constrained to feel like a high-end, near-future professional system.

### Colors
- **Dominant:** Deep Space/Midnight (`#030610`, `#0a1122`).
- **Accents:** Neon Cyan (`#00f0ff`) for safe routes and selections, Amber/Red for critical risk indicators.
- **Rules Enforced:** The UI avoids excessive neon gradients and "cyberpunk" glow. Color is used strictly to communicate status (e.g., threat levels of icebergs) and hierarchy.

### Typography
- **Primary:** `Inter` for all UI panels, maintaining a clean, highly legible Apple-like structure.
- **Data/Metrics:** `JetBrains Mono` for coordinates, speeds, and technical telemetry, providing that rigid, accurate "Mission Control" feel.
- **Hierarchy:** Metrics have been sized to avoid being "too tiny to read" while preserving empty space.

### Glassmorphism (ecdis-glass-card)
- We replaced standard solid cards with `backdrop-filter: blur(24px)` against a translucent `rgba(12, 18, 30, 0.65)` background.
- Borders are ultra-thin `rgba(255, 255, 255, 0.08)` to define edges without clutter.

### Motion & Camera
- **Camera:** `OrbitControls` configured with damping (`dampingFactor={0.05}`) to ensure camera rotation is buttery smooth, cinematic, and never nauseating. The polar angle is restricted to prevent the camera from clipping beneath the Antarctic terrain plane.
- **Liquid Animation:** Framer Motion and Three.js `useFrame` are strictly used for subtle bobbing of the vessels in the water, avoiding distracting, jittery, or game-like particle effects. 

### Spacing & Layout
- A strict spacing system (`4px, 8px, 16px, 24px`) is enforced in `App.css`. 
- Floating HUD elements (like vessel tags and map toolbars) use absolute positioning with flexbox layouts to ensure they never overlap critical 3D map data.

### Accessibility & Responsiveness
- The interface respects standard inputs. The 3D map scales responsively to the width and height of the `ecdis-viewport-container`. Mobile layouts stack panels underneath the map. 

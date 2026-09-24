# Final Demo Checklist

## Pre-Flight Check
- [x] Set `.env` `DATA_MODE=demo` and `DEMO_MODE=true` to guarantee deterministic state.
- [x] Run `npm run build` to verify frontend integrity.
- [x] Verify backend environment is active and running (if full-stack demo is required).

## The Rehearsal Flow
1. **Login & Initialization**: Launch the dashboard; confirm the "Antarctic Situational ECDIS" loads instantly with the orbital 3D camera.
2. **Global View**: Pan and rotate the `OrbitControls` to demonstrate the spatial understanding of the Antarctic sector.
3. **Vessel Focus**: Highlight Ship A and Ship B tracking in 3D.
4. **Environment & Risk**: Toggle "2D TACTICAL" to "3D SPATIAL" to show the system's flexibility. Point out the glowing high-threat icebergs and their 3D radii.
5. **Route Calculation**: Showcase the AI Safe Corridor glowing path through the ice field.
6. **Temporal Drift Simulation**: Scrub the forecast timeline (+0h to +48h). Watch the icebergs drift kinematically in the 3D space with their ghost anchors tracking the T+0 position.
7. **Simulated Emergency**: Trigger the DEMO SOS alert and show how the system gracefully handles the alert without breaking the 3D view.
8. **Reset**: Reset the demo; verify it returns to the exact initial state.

**Status: HACKATHON READY**

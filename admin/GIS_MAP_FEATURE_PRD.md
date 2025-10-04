# 📄 PRD: GIS Map for Admin Dashboard  

<context>  
# Overview  
The GIS Map feature provides the **Admin Dashboard** with a spatial representation of citizen crime reports in Pangasinan. Instead of only viewing reports as tables, administrators will be able to visualize where crimes are happening geographically, identify hotspots, and make informed decisions about resource allocation and crime prevention.  

This feature solves the problem of data being too abstract (rows in a table) and allows faster recognition of **crime patterns by location**. It is valuable for the Provincial PNP HQ and decision-makers in Pangasinan.  

# Core Features  
**1. Pangasinan-Focused Map**  
- What it does: Displays an interactive GIS map limited to the boundaries of Pangasinan province.  
- Why important: Keeps scope relevant and prevents confusion with reports outside jurisdiction.  
- How it works: Use OpenStreetMap/Leaflet (or Google Maps API if available) with bounding coordinates set to Pangasinan.  

**2. Crime Report Markers**  
- What it does: Shows a marker for each citizen report at its location.  
- Why important: Allows admins to see exact crime distribution.  
- How it works: Backend stores latitude/longitude of each report; frontend fetches `/reports` and plots markers on the map.  

**3. Marker Popups with Details**  
- What it does: Clicking a marker opens a popup with crime details (category, description, timestamp, status).  
- Why important: Provides context directly on the map without switching back to the table.  
- How it works: Each report object includes metadata, which is shown in a popup overlay.  

**4. Filtering & Layers (Phase 2 enhancement)**  
- What it does: Admin can filter markers by **crime type**, **status** (Pending, Responding, Resolved), or **date range**.  
- Why important: Enables targeted analysis (e.g., see only thefts in last week).  
- How it works: Query parameters added to backend `/reports`, and frontend dynamically updates map layer.  

**5. Heatmap Visualization (Phase 3 enhancement)**  
- What it does: Aggregates reports into a **heatmap** layer showing density of crime hotspots.  
- Why important: Helps visualize trends over time and areas with recurring crime.  
- How it works: Use a heatmap plugin for Leaflet/Google Maps; intensity based on number of reports in an area.  
</context>  

<PRD>  
# Technical Architecture  

**System Components**  
- **Frontend (Admin Dashboard, React + Vite)**  
  - Uses **Leaflet.js** (open-source) or **Google Maps JS API**.  
  - Fetches data from backend (`GET /reports`). use backend implementation if needed, if not then completely ignore this.
  - Renders markers, popups, filters.  

- **Backend (Express + Node.js)**  
  - use backend implementation if needed, if not then completely ignore this. 

- **Data Model Update**  
  ```json
  {
    "id": 1,
    "maincategory": "Crime",
    "subcategory": "Theft",
    "description": "Stolen phone at plaza",
    "status": "Resolved",
    "location": "Dagupan City Plaza",
    "latitude": 16.0433,
    "longitude": 120.3333,
    "anonymous": true,
    "timestamp": "2025-09-09T12:30:00Z"
  }

# Infrastructure
- Requires stable internet (GIS map tiles loaded from OpenStreetMap/Google).  
- For offline resilience: can cache Pangasinan map tiles.  

# Development Roadmap
**MVP (Phase 1)**  
- Display Pangasinan map in Admin Dashboard.  
- Fetch reports with lat/long and show as markers.  
- Clicking marker → popup with details.  

**Phase 2 Enhancements**  
- Filtering (crime type, date, status).  
- Cluster markers when zoomed out.  

**Phase 3 Enhancements**  
- Heatmap visualization.  
- Time slider to visualize crime trends by date.  
- Integration with PNP GIS datasets (if available).  

# Logical Dependency Chain
1. Update backend data model → store latitude/longitude for reports.  
2. Update report submission (citizen app) → auto-fetch GPS (expo-location) or allow manual input.  
3. Extend backend `/reports` → include geolocation data.  
4. Admin frontend → display map with markers.  
5. Later → add filters, clustering, heatmap.  

# Risks and Mitigations
- **Accurate location capture**: Citizens may provide vague addresses → use geocoding API (Google Maps Geocoding or OpenStreetMap Nominatim) to convert address → lat/long.  
- **Performance**: Too many markers could slow down → mitigate with clustering and pagination.  
- **API cost**: Google Maps API requires billing; mitigate by starting with free/open Leaflet + OSM tiles.  

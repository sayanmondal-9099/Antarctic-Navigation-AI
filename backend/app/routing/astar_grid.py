import math
from typing import List, Dict, Any, Tuple, Optional
import networkx as nx
from app.models.schemas import Position, Waypoint, RouteResponse, RoutingResponse
from app.models.data_models import NormalizedEnvironmentalSnapshot, NormalizedVessel
from app.risk.calculator import RiskConfig, haversine_distance_nm
from app.routing.routing_cost import RoutingCostEvaluator

class RiskAwareRouter:
    def __init__(self, snapshot: NormalizedEnvironmentalSnapshot, ownship: NormalizedVessel, forecast_hazards: Optional[List[Any]] = None):
        self.snapshot = snapshot
        self.ownship = ownship
        self.forecast_hazards = forecast_hazards or []
        
        # Configure the 3 Risk Profiles
        self.profiles = {
            "safest": RiskConfig(iceberg_weight=0.45, ice_weight=0.25, vessel_weight=0.25, weather_weight=0.05, current_weight=0.0),
            "balanced": RiskConfig(iceberg_weight=0.35, ice_weight=0.20, vessel_weight=0.20, weather_weight=0.15, current_weight=0.10),
            "fastest": RiskConfig(iceberg_weight=0.20, ice_weight=0.15, vessel_weight=0.15, weather_weight=0.10, current_weight=0.40)
        }
        
    def _build_and_solve_graph(
        self,
        origin: Position,
        destination: Position,
        mode: str,
        economic_speed_knots: float
    ) -> RouteResponse:
        
        config = self.profiles.get(mode, self.profiles["balanced"])
        evaluator = RoutingCostEvaluator(config)
        
        lat_min = min(origin.lat, destination.lat) - 1.2
        lat_max = max(origin.lat, destination.lat) + 1.2
        lon_min = min(origin.lon, destination.lon) - 1.5
        lon_max = max(origin.lon, destination.lon) + 1.5
        
        step_lat = 0.15
        step_lon = 0.30
        
        G = nx.Graph()
        
        orig_node = (round(origin.lat, 4), round(origin.lon, 4))
        dest_node = (round(destination.lat, 4), round(destination.lon, 4))
        G.add_node(orig_node)
        G.add_node(dest_node)
        
        lats = []
        cur_lat = lat_min
        while cur_lat <= lat_max:
            lats.append(round(cur_lat, 4))
            cur_lat += step_lat
            
        lons = []
        cur_lon = lon_min
        while cur_lon <= lon_max:
            lons.append(round(cur_lon, 4))
            cur_lon += step_lon
            
        # Store risk data on nodes to build waypoints later
        node_data = {}
            
        for la in lats:
            for lo in lons:
                node = (la, lo)
                dist_to_orig = haversine_distance_nm(la, lo, origin.lat, origin.lon)
                # Quick evaluation just to flag blocked nodes
                _, brk, is_blocked, score, _ = evaluator.evaluate_edge_cost(la, lo, 1.0, self.snapshot, self.ownship, forecast_hazards=self.forecast_hazards)
                
                # Never block the exact origin or close to it to prevent impossible starts
                if is_blocked and dist_to_orig > 2.0:
                    continue
                    
                G.add_node(node)
                node_data[node] = {"breakdown": brk, "score": score}
                
        # Origin and Destination data
        _, o_brk, _, o_score, _ = evaluator.evaluate_edge_cost(orig_node[0], orig_node[1], 1.0, self.snapshot, self.ownship, forecast_hazards=self.forecast_hazards)
        _, d_brk, _, d_score, _ = evaluator.evaluate_edge_cost(dest_node[0], dest_node[1], 1.0, self.snapshot, self.ownship, forecast_hazards=self.forecast_hazards)
        node_data[orig_node] = {"breakdown": o_brk, "score": o_score}
        node_data[dest_node] = {"breakdown": d_brk, "score": d_score}
                
        for node in list(G.nodes):
            if node == orig_node or node == dest_node:
                continue
            la, lo = node
            for d_la in [-step_lat, 0.0, step_lat]:
                for d_lo in [-step_lon, 0.0, step_lon]:
                    if d_la == 0.0 and d_lo == 0.0:
                        continue
                    neighbor = (round(la + d_la, 4), round(lo + d_lo, 4))
                    if neighbor in G:
                        dist_nm = haversine_distance_nm(la, lo, neighbor[0], neighbor[1])
                        # Calculate cost going into neighbor
                        cost, _, is_blocked, _, _ = evaluator.evaluate_edge_cost(neighbor[0], neighbor[1], dist_nm, self.snapshot, self.ownship, la, lo, forecast_hazards=self.forecast_hazards)
                        # The edge weight is asymmetric conceptually, but we can treat it symmetrically for basic grid
                        G.add_edge(node, neighbor, weight=cost)
                        
        # Connect origin and destination to nearby grid nodes
        for node in list(G.nodes):
            if node != orig_node:
                d_orig = haversine_distance_nm(orig_node[0], orig_node[1], node[0], node[1])
                if d_orig < 25.0:
                    c, _, _, _, _ = evaluator.evaluate_edge_cost(node[0], node[1], d_orig, self.snapshot, self.ownship, orig_node[0], orig_node[1], forecast_hazards=self.forecast_hazards)
                    G.add_edge(orig_node, node, weight=c)
            if node != dest_node:
                d_dest = haversine_distance_nm(dest_node[0], dest_node[1], node[0], node[1])
                if d_dest < 25.0:
                    c, _, _, _, _ = evaluator.evaluate_edge_cost(dest_node[0], dest_node[1], d_dest, self.snapshot, self.ownship, node[0], node[1], forecast_hazards=self.forecast_hazards)
                    G.add_edge(node, dest_node, weight=c)
                    
        def astar_heuristic(u, v):
            return haversine_distance_nm(u[0], u[1], v[0], v[1])
            
        try:
            path = nx.astar_path(G, orig_node, dest_node, heuristic=astar_heuristic, weight="weight")
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            path = [orig_node, dest_node]
            
        # Simplify path (downsample)
        simplified_path = [path[0]]
        for i in range(1, len(path) - 1):
            if i % max(1, len(path) // 5) == 0:
                simplified_path.append(path[i])
        simplified_path.append(path[-1])
        
        waypoints: List[Waypoint] = []
        total_dist = 0.0
        prev_coord = simplified_path[0]
        
        total_ice, total_iceberg, total_weather, total_current, total_vessel = 0.0, 0.0, 0.0, 0.0, 0.0
        total_score = 0.0
        duration_hours = 0.0
        
        for idx, (w_lat, w_lon) in enumerate(simplified_path):
            leg_dist = haversine_distance_nm(prev_coord[0], prev_coord[1], w_lat, w_lon) if idx > 0 else 0.0
            total_dist += leg_dist
            prev_coord = (w_lat, w_lon)
            
            n_data = node_data.get((w_lat, w_lon), {"breakdown": o_brk, "score": 0.0})
            brk = n_data["breakdown"]
            score = n_data["score"]
            
            # Recalculate edge cost along path to get effective speed
            if idx > 0:
                _, _, _, _, eff_speed = evaluator.evaluate_edge_cost(w_lat, w_lon, leg_dist, self.snapshot, self.ownship, simplified_path[idx-1][0], simplified_path[idx-1][1], forecast_hazards=self.forecast_hazards)
                duration_hours += leg_dist / eff_speed
            
            total_ice += brk.ice
            total_iceberg += brk.iceberg
            total_weather += brk.weather
            total_current += brk.current
            total_vessel += brk.vessel
            total_score += score
            
            wp_name = "Origin" if idx == 0 else "Destination" if idx == len(simplified_path)-1 else f"WP-{idx:02d}"
            waypoints.append(
                Waypoint(
                    id=f"wp-{idx:02d}-{mode}",
                    name=wp_name,
                    lat=w_lat,
                    lon=w_lon,
                    order=idx + 1,
                    ice_risk_score=round(score * 100, 1),
                    notes=f"Risk Score: {round(score * 100, 1)}%"
                )
            )
            
        avg_score = round((total_score / len(simplified_path)) * 100, 1)
        # duration_hours is now iteratively summed
        
        # Risk level string
        risk_lvl = "LOW"
        if avg_score > 75: risk_lvl = "CRITICAL"
        elif avg_score > 50: risk_lvl = "HIGH"
        elif avg_score > 25: risk_lvl = "MODERATE"
        
        import app.models.schemas as schemas
        
        return RouteResponse(
            id=f"route-{mode}",
            name=f"{mode.capitalize()} Route",
            type="recommended" if mode == "balanced" else "alternative",
            total_distance_nm=round(total_dist, 1),
            estimated_duration_hours=round(duration_hours, 1),
            average_risk_score=avg_score,
            risk_level=risk_lvl,
            routing_mode=mode,
            risk_breakdown=schemas.RiskBreakdown(
                ice=round(total_ice / len(simplified_path) * 100, 1),
                iceberg=round(total_iceberg / len(simplified_path) * 100, 1),
                weather=round(total_weather / len(simplified_path) * 100, 1),
                current=round(total_current / len(simplified_path) * 100, 1),
                vessel=round(total_vessel / len(simplified_path) * 100, 1)
            ),
            waypoints=waypoints,
            advisories=[f"Calculated using {mode.capitalize()} profile."]
        )

    def optimize_routes(
        self,
        origin: Position,
        destination: Position,
        requested_mode: str = "balanced",
        economic_speed_knots: float = 12.0
    ) -> RoutingResponse:
        """
        Calculates all 3 route modes and returns the RoutingResponse wrapper.
        """
        routes = []
        for mode in ["safest", "balanced", "fastest"]:
            r = self._build_and_solve_graph(origin, destination, mode, economic_speed_knots)
            routes.append(r)
            
        rec_route = next((r for r in routes if r.routing_mode == requested_mode), routes[1])
        rec_route.type = "recommended"
        alt_routes = [r for r in routes if r.routing_mode != requested_mode]
        for a in alt_routes:
            a.type = "alternative"
            
        warnings = []
        if rec_route.risk_level in ["HIGH", "CRITICAL"]:
            warnings.append(f"WARNING: Recommended route entails {rec_route.risk_level} risk.")
            
        return RoutingResponse(
            recommended_route=rec_route,
            alternative_routes=alt_routes,
            warnings=warnings
        )

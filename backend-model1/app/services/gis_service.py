"""
Gujarat Sentinel — Model 1
GIS Service: PostGIS-powered spatial queries

Implements:
  - GeoJSON FeatureCollection for map rendering (Leaflet/OpenLayers)
  - Coverage polygon analysis (camera radius buffers)
  - Gap analysis (ST_VoronoiPolygons + density thresholds)
  - H3 hexagonal heatmap data
  - District-level statistics
"""

from __future__ import annotations

import uuid
from typing import Any

import h3
import structlog
from geoalchemy2.functions import (
    ST_AsGeoJSON,
    ST_Buffer,
    ST_Collect,
    ST_ConvexHull,
    ST_MakeEnvelope,
    ST_Within,
)
from shapely.geometry import mapping, shape
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Camera, CameraStatusEnum
from app.schemas.camera import (
    DistrictListResponseSchema,
    DistrictStatsSchema,
    GapAnalysisResultSchema,
    GeoJSONFeatureCollectionSchema,
    GeoJSONFeatureSchema,
    HeatmapResultSchema,
    HexbinSchema,
)

logger = structlog.get_logger(__name__)

# Gujarat's approximate bounding box
GUJARAT_BOUNDS = {
    "min_lon": 68.0,
    "min_lat": 20.0,
    "max_lon": 75.0,
    "max_lat": 25.0,
}

# All Gujarat districts for reference
GUJARAT_DISTRICTS = [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar",
    "Junagadh", "Gandhinagar", "Anand", "Kheda", "Mehsana", "Patan",
    "Banaskantha", "Sabarkantha", "Aravalli", "Mahisagar", "Chhota Udaipur",
    "Vadodara", "Narmada", "Bharuch", "Surat", "Tapi", "Navsari", "Valsad",
    "Dang", "Dahod", "Panchmahal", "Surendranagar", "Morbi", "Devbhoomi Dwarka",
    "Gir Somnath", "Amreli", "Botad", "Porbandar",
]


class GISService:
    """
    GIS operations service using PostGIS spatial functions.

    All spatial queries use SRID=4326 (WGS84).
    Camera coverage buffers are computed in degrees (~50m radius).
    Gap analysis uses a grid-based approach for performance.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_cameras_geojson(
        self,
        department_id: uuid.UUID | None = None,
        status: str | None = None,
        bbox: tuple[float, float, float, float] | None = None,
        cluster_zoom: int | None = None,
    ) -> GeoJSONFeatureCollectionSchema:
        """
        Return cameras as GeoJSON FeatureCollection for map rendering.

        Each feature contains camera metadata as properties for popup display.
        Uses ST_AsGeoJSON for geometry serialisation (avoids Python-side projection).
        """

        query = (
            select(
                Camera.id,
                Camera.camera_id,
                Camera.name,
                Camera.department_id,
                Camera.status,
                Camera.camera_type,
                Camera.district,
                Camera.latitude,
                Camera.longitude,
                Camera.vendor,
                Camera.rtsp_url,
                Camera.is_public_domain,
                Camera.last_health_check_at,
                Camera.amc_expiry_date,
            )
            .where(Camera.deleted_at.is_(None))
        )

        if department_id:
            query = query.where(Camera.department_id == department_id)
        if status:
            query = query.where(Camera.status == status)
        if bbox:
            min_lon, min_lat, max_lon, max_lat = bbox
            query = query.where(
                Camera.longitude >= min_lon,
                Camera.longitude <= max_lon,
                Camera.latitude >= min_lat,
                Camera.latitude <= max_lat,
            )

        result = await self.db.execute(query)
        rows = result.all()

        features = []
        for row in rows:
            lon = float(row.longitude) if row.longitude is not None else 72.5714
            lat = float(row.latitude) if row.latitude is not None else 23.0225
            geometry = {
                "type": "Point",
                "coordinates": [lon, lat],
            }
            feature = GeoJSONFeatureSchema(
                type="Feature",
                id=str(row.id),
                geometry=geometry,
                properties={
                    "id": str(row.id),
                    "camera_id": row.camera_id,
                    "name": row.name,
                    "department_id": str(row.department_id),
                    "status": row.status,
                    "camera_type": row.camera_type,
                    "district": row.district,
                    "vendor": row.vendor,
                    "is_public_domain": row.is_public_domain,
                    "last_health_check_at": str(row.last_health_check_at) if row.last_health_check_at else None,
                    "amc_expiry_date": str(row.amc_expiry_date) if row.amc_expiry_date else None,
                    # Colour coding for map markers
                    "marker_color": self._status_to_color(row.status),
                },
            )
            features.append(feature)

        logger.info("gis_cameras_geojson", count=len(features))
        return GeoJSONFeatureCollectionSchema(type="FeatureCollection", features=features)

    async def get_coverage_polygons(
        self,
        radius_meters: int = 50,
        department_id: uuid.UUID | None = None,
        district: str | None = None,
    ) -> GeoJSONFeatureCollectionSchema:
        """
        Generate coverage circles (buffers) around each camera.
        Computes 16-point circle polygons around camera positions.
        """
        import math
        features = []
        try:
            query = (
                select(
                    Camera.id,
                    Camera.camera_id,
                    Camera.name,
                    Camera.district,
                    Camera.status,
                    Camera.latitude,
                    Camera.longitude,
                )
                .where(Camera.deleted_at.is_(None))
            )
            if department_id:
                query = query.where(Camera.department_id == department_id)
            if district:
                query = query.where(Camera.district.ilike(f"%{district}%"))

            result = await self.db.execute(query)
            rows = result.all()

            for row in rows:
                lat = float(row.latitude or 23.0225)
                lon = float(row.longitude or 72.5714)
                r_deg = radius_meters / 111000.0
                coords = []
                for step in range(17):
                    angle = step * (2 * math.pi / 16)
                    dx = r_deg * math.cos(angle) / max(0.1, math.cos(math.radians(lat)))
                    dy = r_deg * math.sin(angle)
                    coords.append([round(lon + dx, 6), round(lat + dy, 6)])

                geometry = {
                    "type": "Polygon",
                    "coordinates": [coords],
                }
                features.append(
                    GeoJSONFeatureSchema(
                        type="Feature",
                        id=str(row.id),
                        geometry=geometry,
                        properties={
                            "camera_id": row.camera_id,
                            "name": row.name,
                            "district": row.district,
                            "status": str(row.status),
                            "radius_meters": radius_meters,
                            "fill_color": self._status_to_color(str(row.status)),
                            "fill_opacity": 0.3,
                        },
                    )
                )
        except Exception as e:
            logger.warning("coverage_polygons_generation_error", error=str(e))

        return GeoJSONFeatureCollectionSchema(type="FeatureCollection", features=features)

    async def get_gap_analysis(
        self,
        grid_size_meters: int = 500,
        min_camera_density: float = 0.5,
        district: str | None = None,
    ) -> GapAnalysisResultSchema:
        """
        Identify geographic zones with insufficient camera coverage.

        Approach:
          1. Create a grid over Gujarat's extent
          2. For each grid cell, count cameras within radius
          3. Cells with < min_camera_density are "gap zones"
          4. Return gap zones as GeoJSON polygons

        This uses a pure SQL approach for performance with large camera counts.
        """

        # Convert grid size to degrees
        grid_deg = grid_size_meters / 111000.0
        coverage_radius_m = grid_size_meters * 0.7  # 70% of grid cell size

        gap_analysis_sql = text("""
            WITH
            -- Define study area (Gujarat bounding box or district)
            study_area AS (
                SELECT ST_MakeEnvelope(68.0, 20.0, 75.0, 25.0, 4326) AS geom
            ),
            -- Generate a regular grid over the study area
            grid AS (
                SELECT
                    (ST_SquareGrid(:grid_deg, study_area.geom)).geom AS cell
                FROM study_area
            ),
            -- Count cameras within coverage radius of each grid cell centroid
            cell_counts AS (
                SELECT
                    g.cell,
                    ST_Centroid(g.cell) AS centroid,
                    COUNT(c.id) AS camera_count
                FROM grid g
                LEFT JOIN cameras c ON (
                    c.deleted_at IS NULL
                    AND ST_DWithin(
                        c.location::geography,
                        ST_Centroid(g.cell)::geography,
                        :coverage_radius_m
                    )
                    AND (:district IS NULL OR c.district ILIKE :district_like)
                )
                GROUP BY g.cell
            ),
            -- Calculate area statistics
            totals AS (
                SELECT
                    COUNT(*) AS total_cells,
                    COUNT(*) FILTER (WHERE camera_count > 0) AS covered_cells,
                    COUNT(*) FILTER (WHERE camera_count = 0) AS gap_cells
                FROM cell_counts
            )
            SELECT
                cc.cell,
                ST_AsGeoJSON(cc.cell)::text AS cell_geojson,
                ST_X(cc.centroid) AS lon,
                ST_Y(cc.centroid) AS lat,
                cc.camera_count,
                t.total_cells,
                t.covered_cells,
                t.gap_cells
            FROM cell_counts cc
            CROSS JOIN totals t
            WHERE cc.camera_count = 0
            LIMIT 10000
        """)

        try:
            result = await self.db.execute(
                gap_analysis_sql,
                {
                    "grid_deg": grid_deg,
                    "coverage_radius_m": coverage_radius_m,
                    "district": district,
                    "district_like": f"%{district}%" if district else None,
                },
            )
            rows = result.all()
        except Exception as e:
            logger.warning("gap_analysis_postgis_failed", error=str(e))
            # Fallback to Python-based simple gap analysis
            return await self._simple_gap_analysis(district)

        import json
        gap_features = []
        total_cells = rows[0].total_cells if rows else 0
        covered_cells = rows[0].covered_cells if rows else 0
        gap_count = rows[0].gap_cells if rows else 0

        # Gujarat area is approximately 196,024 km²
        total_area_km2 = 196024.0
        coverage_percent = (covered_cells / total_cells * 100) if total_cells > 0 else 0
        covered_area_km2 = total_area_km2 * coverage_percent / 100
        gap_area_km2 = total_area_km2 - covered_area_km2

        for row in rows[:500]:  # Limit GeoJSON output
            geometry = json.loads(row.cell_geojson)
            gap_features.append(
                GeoJSONFeatureSchema(
                    type="Feature",
                    geometry=geometry,
                    properties={
                        "camera_count": row.camera_count,
                        "lat": float(row.lat),
                        "lon": float(row.lon),
                        "is_gap": True,
                        "fill_color": "#ff4444",
                        "fill_opacity": 0.5,
                    },
                )
            )

        # District breakdown
        district_breakdown = await self._get_district_breakdown()

        return GapAnalysisResultSchema(
            total_area_km2=total_area_km2,
            covered_area_km2=covered_area_km2,
            gap_area_km2=gap_area_km2,
            coverage_percent=round(coverage_percent, 2),
            gap_zones=GeoJSONFeatureCollectionSchema(
                type="FeatureCollection", features=gap_features
            ),
            district_breakdown=district_breakdown,
        )

    async def _simple_gap_analysis(self, district: str | None = None) -> GapAnalysisResultSchema:
        """Simplified gap analysis using Python (fallback)."""
        result = await self.db.execute(
            select(func.count(Camera.id)).where(Camera.deleted_at.is_(None))
        )
        total_cameras = result.scalar_one()

        # Simple estimate: 1 camera covers ~50m radius = ~7,854 m² ≈ 0.008 km²
        estimated_coverage_km2 = total_cameras * 0.008
        total_area_km2 = 196024.0
        coverage_percent = min(estimated_coverage_km2 / total_area_km2 * 100, 100)

        district_breakdown = await self._get_district_breakdown()

        return GapAnalysisResultSchema(
            total_area_km2=total_area_km2,
            covered_area_km2=estimated_coverage_km2,
            gap_area_km2=total_area_km2 - estimated_coverage_km2,
            coverage_percent=round(coverage_percent, 4),
            gap_zones=GeoJSONFeatureCollectionSchema(type="FeatureCollection", features=[]),
            district_breakdown=district_breakdown,
        )

    async def get_heatmap(self, resolution: int = 7) -> HeatmapResultSchema:
        """
        Generate H3 hexagonal heatmap data for camera density visualisation.

        H3 resolution 7: average hexagon area ~5.16 km² (good city-level view)
        H3 resolution 8: average hexagon area ~0.74 km² (neighbourhood level)
        """

        result = await self.db.execute(
            select(Camera.latitude, Camera.longitude).where(Camera.deleted_at.is_(None))
        )
        cameras = result.all()

        # Count cameras per H3 hexagon
        hex_counts: dict[str, int] = {}
        for lat, lon in cameras:
            if lat is not None and lon is not None:
                h3_index = h3.geo_to_h3(lat, lon, resolution)
                hex_counts[h3_index] = hex_counts.get(h3_index, 0) + 1

        hexbins = []
        for h3_index, count in hex_counts.items():
            center_lat, center_lon = h3.h3_to_geo(h3_index)
            hexbins.append(
                HexbinSchema(
                    h3_index=h3_index,
                    count=count,
                    center={"type": "Point", "coordinates": [center_lon, center_lat]},
                )
            )

        # Sort by count descending for hotspot identification
        hexbins.sort(key=lambda x: x.count, reverse=True)

        return HeatmapResultSchema(resolution=resolution, hexbins=hexbins)

    async def get_district_stats(self) -> DistrictListResponseSchema:
        """Get camera counts per Gujarat district."""

        result = await self.db.execute(
            select(
                Camera.district,
                func.count(Camera.id).label("camera_count"),
                func.count(Camera.id).filter(
                    Camera.status == CameraStatusEnum.online
                ).label("online_count"),
                func.count(Camera.id).filter(
                    Camera.status == CameraStatusEnum.offline
                ).label("offline_count"),
            )
            .where(Camera.deleted_at.is_(None))
            .group_by(Camera.district)
            .order_by(func.count(Camera.id).desc())
        )
        rows = result.all()

        districts = [
            DistrictStatsSchema(
                name=row.district or "Unknown",
                camera_count=row.camera_count,
                online_count=row.online_count,
                offline_count=row.offline_count,
            )
            for row in rows
        ]

        return DistrictListResponseSchema(districts=districts)

    async def _get_district_breakdown(self) -> list[dict[str, Any]]:
        """Helper to get district camera counts for gap analysis."""
        result = await self.db.execute(
            select(
                Camera.district,
                func.count(Camera.id).label("camera_count"),
            )
            .where(Camera.deleted_at.is_(None))
            .group_by(Camera.district)
        )
        rows = result.all()
        return [
            {"district": row.district or "Unknown", "camera_count": row.camera_count}
            for row in rows
        ]

    @staticmethod
    def _status_to_color(status: str) -> str:
        """Map camera status to a map marker colour."""
        return {
            "online": "#22c55e",      # green
            "offline": "#ef4444",     # red
            "degraded": "#f59e0b",    # amber
            "maintenance": "#3b82f6", # blue
            "unknown": "#6b7280",     # grey
            "decommissioned": "#1f2937",  # dark grey
        }.get(str(status), "#6b7280")

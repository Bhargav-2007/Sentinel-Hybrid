import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera } from '../../types/camera';
import { AlertIncident } from '../../types/alert';

interface GujaratGISMapProps {
  cameras: Camera[];
  alerts?: AlertIncident[];
  trajectoryPoints?: Array<{ latitude: number; longitude: number; speed_kmh?: number; timestamp?: string }>;
  onSelectCamera?: (camera: Camera) => void;
  selectedCameraId?: string;
  height?: string;
}

export const GujaratGISMap: React.FC<GujaratGISMapProps> = ({
  cameras,
  alerts = [],
  trajectoryPoints = [],
  onSelectCamera,
  selectedCameraId,
  height = '100%',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map centered over Gujarat
      const map = L.map(mapContainerRef.current, {
        center: [23.0225, 72.5714], // Ahmedabad / Gandhinagar corridor
        zoom: 8,
        zoomControl: true,
      });

      // Dark theme Carto tiles for 24x7 police command walls
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; Gujarat Police Cyber Command | OpenStreetMap',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      routeGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update camera and alert markers + animated route polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    const routeGroup = routeGroupRef.current;
    if (!map || !group || !routeGroup) return;

    group.clearLayers();
    routeGroup.clearLayers();

    // 1. Render Cameras
    cameras.forEach((cam) => {
      const isSelected = cam.id === selectedCameraId;
      const isOnline = cam.status === 'ONLINE';

      const color = isSelected ? '#00E5FF' : isOnline ? '#10B981' : '#EF4444';
      const radius = isSelected ? 9 : 6;

      const marker = L.circleMarker([cam.latitude, cam.longitude], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: isSelected ? 3 : 1.5,
      });

      const popupContent = `
        <div style="font-family: monospace; font-size: 12px; color: #0f172a; padding: 4px;">
          <div style="font-weight: bold; color: #0284c7; margin-bottom: 2px;">${cam.camera_code}</div>
          <div style="font-weight: 600;">${cam.name}</div>
          <div style="color: #64748b; font-size: 10px; margin-top: 2px;">${cam.district} • ${cam.station || 'PS'}</div>
          <div style="margin-top: 6px; font-weight: bold; color: ${isOnline ? '#059669' : '#dc2626'};">
            ● ${cam.status} (${cam.camera_type})
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectCamera) {
          onSelectCamera(cam);
        }
      });

      marker.addTo(group);
    });

    // 2. Render Active APB Alerts (Pulsing Red)
    alerts.forEach((alt) => {
      if (alt.status === 'NEW' || alt.status === 'INVESTIGATING') {
        const alertMarker = L.circleMarker([alt.latitude, alt.longitude], {
          radius: 14,
          color: '#EF4444',
          fillColor: '#EF4444',
          fillOpacity: 0.35,
          weight: 2,
        });

        alertMarker.bindPopup(`
          <div style="font-family: monospace; font-size: 12px; color: #7f1d1d; padding: 4px;">
            <div style="font-weight: bold; color: #dc2626;">🚨 APB ALERT • ${alt.severity}</div>
            <div style="font-weight: bold; margin-top: 2px;">${alt.detected_plate || 'UNKNOWN'}</div>
            <div style="color: #475569; font-size: 10px;">${alt.title}</div>
          </div>
        `);

        alertMarker.addTo(group);
      }
    });

    // 3. Render Animated Highway Pursuit Polyline Route
    // Default corridor route between SG Highway checkpoints if no explicit trajectory given
    const sampleRoute = trajectoryPoints.length > 1 ? trajectoryPoints : [
      { latitude: 23.0125, longitude: 72.5085 }, // Prahladnagar
      { latitude: 23.0245, longitude: 72.5180 }, // ISKCON
      { latitude: 23.0550, longitude: 72.5290 }, // Thaltej
      { latitude: 23.0780, longitude: 72.5350 }, // Gota
    ];

    if (sampleRoute.length >= 2) {
      const latLngs: L.LatLngExpression[] = sampleRoute.map((p) => [p.latitude, p.longitude]);
      const polyline = L.polyline(latLngs, {
        color: '#00E5FF',
        weight: 3,
        opacity: 0.75,
        dashArray: '6, 8',
      });
      polyline.addTo(routeGroup);
    }
  }, [cameras, alerts, trajectoryPoints, selectedCameraId, onSelectCamera]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 shadow-xl" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/85 backdrop-blur-md border border-slate-800 p-2.5 rounded-lg text-[10px] font-mono flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-slate-300">Online Cam</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-slate-300">Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-red-300 font-bold">APB Alert</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-0.5 border-t border-dashed border-cyan-400" />
          <span className="text-cyan-300">Active Pursuit Route</span>
        </div>
      </div>
    </div>
  );
};

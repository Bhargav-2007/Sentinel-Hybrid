import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera } from '../../types/camera';
import { AlertIncident } from '../../types/alert';

interface GujaratGISMapProps {
  cameras: Camera[];
  alerts?: AlertIncident[];
  onSelectCamera?: (camera: Camera) => void;
  selectedCameraId?: string;
  height?: string;
}

export const GujaratGISMap: React.FC<GujaratGISMapProps> = ({
  cameras,
  alerts = [],
  onSelectCamera,
  selectedCameraId,
  height = '100%',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

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
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update camera and alert markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

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
  }, [cameras, alerts, selectedCameraId, onSelectCamera]);

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
      </div>
    </div>
  );
};

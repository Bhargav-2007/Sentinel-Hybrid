import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CameraNode } from '../../core/types/camera';
import { TrajectoryPoint } from '../../core/types/tracking';

interface MapViewProps {
  cameras?: CameraNode[];
  trajectory?: TrajectoryPoint[];
  selectedCameraId?: string;
  onCameraSelect?: (camera: CameraNode) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  cameras = [],
  trajectory = [],
  selectedCameraId,
  onCameraSelect,
  center = [23.0225, 72.5714], // Gujarat Center
  zoom = 12,
  height = 'h-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    // Dark Matter Carto Tile Layer for High-Tech SOC Look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Camera Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    cameras.forEach((cam) => {
      const isSelected = cam.camera_id === selectedCameraId;
      const isOnline = cam.status === 'ONLINE';

      const icon = L.divIcon({
        className: 'custom-cam-icon',
        html: `
          <div style="
            width: ${isSelected ? '22px' : '14px'};
            height: ${isSelected ? '22px' : '14px'};
            background: ${isSelected ? '#00f0ff' : isOnline ? '#00ff99' : '#ff0055'};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 ${isSelected ? '16px #00f0ff' : '8px ' + (isOnline ? '#00ff99' : '#ff0055')};
            display: flex; align-items: center; justify-content: center;
          "></div>
        `,
        iconSize: isSelected ? [22, 22] : [14, 14],
        iconAnchor: isSelected ? [11, 11] : [7, 7],
      });

      const marker = L.marker([cam.location.latitude, cam.location.longitude], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; color: #fff; background: #0a172e; padding: 4px;">
          <b style="color: #00f0ff;">${cam.name}</b><br/>
          <span style="color: #94a3b8;">ID: ${cam.camera_id} &bull; Dept: ${cam.department_name || cam.department_id}</span><br/>
          <span style="color: ${isOnline ? '#00ff99' : '#ff0055'}; font-weight: bold;">● ${cam.status}</span>
        </div>
      `);

      marker.on('click', () => {
        if (onCameraSelect) onCameraSelect(cam);
      });

      markersRef.current.push(marker);
    });
  }, [cameras, selectedCameraId, onCameraSelect]);

  // Update Trajectory Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (trajectory.length > 1) {
      const latlngs: [number, number][] = trajectory.map((pt) => [pt.latitude, pt.longitude]);
      polylineRef.current = L.polyline(latlngs, {
        color: '#ff0055',
        weight: 4,
        opacity: 0.9,
        dashArray: '6, 6',
      }).addTo(map);

      map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [trajectory]);

  return <div ref={mapContainerRef} className={`w-full ${height} rounded border border-slate-800 relative z-0`} />;
};

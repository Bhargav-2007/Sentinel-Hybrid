import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CameraNode } from '../../core/types/camera';
import { TrajectoryPoint } from '../../core/types/tracking';

interface MapViewProps {
  cameras?: CameraNode[];
  trajectory?: TrajectoryPoint[];
  targetPlate?: string;
  selectedCameraId?: string;
  onCameraSelect?: (camera: CameraNode) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  cameras = [],
  trajectory = [],
  targetPlate,
  selectedCameraId,
  onCameraSelect,
  center = [23.0225, 72.5714], // Gujarat Center
  zoom = 12,
  height = 'h-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const trajectoryMarkersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polylineGlowRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    // High-Tech SOC Tactical Basemap
    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
      attribution: '&copy; Gujarat Police GIS &copy; OpenStreetMap contributors',
      maxZoom: 19,
      subdomains: 'abcd',
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

    // Clear old camera markers
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
            cursor: pointer;
          "></div>
        `,
        iconSize: isSelected ? [22, 22] : [14, 14],
        iconAnchor: isSelected ? [11, 11] : [7, 7],
      });

      const marker = L.marker([cam.location.latitude, cam.location.longitude], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; color: #fff; background: #0a172e; padding: 6px; border-radius: 4px; min-width: 180px;">
          <b style="color: #00f0ff;">${cam.name}</b><br/>
          <span style="color: #94a3b8;">ID: ${cam.camera_id.toUpperCase()} &bull; ${cam.location.district}</span><br/>
          <div style="margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: ${isOnline ? '#00ff99' : '#ff0055'}; font-weight: bold;">● ${cam.status}</span>
            <span style="color: #cbd5e1; font-size: 10px;">${cam.resolution}</span>
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onCameraSelect) onCameraSelect(cam);
      });

      markersRef.current.push(marker);
    });
  }, [cameras, selectedCameraId, onCameraSelect]);

  // Update Trajectory Polyline & Numbered Node Sequence Checkpoints
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old trajectory lines
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    if (polylineGlowRef.current) {
      map.removeLayer(polylineGlowRef.current);
      polylineGlowRef.current = null;
    }

    // Clear old trajectory markers
    trajectoryMarkersRef.current.forEach((m) => map.removeLayer(m));
    trajectoryMarkersRef.current = [];

    if (trajectory && trajectory.length > 0) {
      const validPoints = trajectory.filter((pt) => pt.latitude && pt.longitude && !isNaN(pt.latitude) && !isNaN(pt.longitude));

      if (validPoints.length > 1) {
        const latlngs: [number, number][] = validPoints.map((pt) => [pt.latitude, pt.longitude]);

        // Glowing outer polyline
        polylineGlowRef.current = L.polyline(latlngs, {
          color: '#00f0ff',
          weight: 8,
          opacity: 0.4,
          lineCap: 'round',
        }).addTo(map);

        // Core pulsating path polyline
        polylineRef.current = L.polyline(latlngs, {
          color: '#ff0055',
          weight: 4,
          opacity: 0.95,
          dashArray: '8, 8',
        }).addTo(map);

        map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
      } else if (validPoints.length === 1) {
        map.setView([validPoints[0].latitude, validPoints[0].longitude], 13);
      }

      // Render Numbered Route Node Checkpoints (1, 2, 3, 4...)
      validPoints.forEach((pt, idx) => {
        const isLatest = idx === validPoints.length - 1;
        const icon = L.divIcon({
          className: 'trajectory-node-icon',
          html: `
            <div style="position: relative; cursor: pointer;">
              <div style="
                width: ${isLatest ? '30px' : '24px'};
                height: ${isLatest ? '30px' : '24px'};
                background: ${isLatest ? '#ff0055' : '#0a172e'};
                border: 2px solid ${isLatest ? '#ffffff' : '#00f0ff'};
                border-radius: 50%;
                color: #ffffff;
                font-family: monospace;
                font-weight: 800;
                font-size: ${isLatest ? '12px' : '10px'};
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 16px ${isLatest ? '#ff0055' : '#00f0ff'};
              ">${idx + 1}</div>
              ${
                isLatest
                  ? `<div style="
                      position: absolute;
                      top: -4px;
                      left: -4px;
                      width: 38px;
                      height: 38px;
                      border: 2px solid #ff0055;
                      border-radius: 50%;
                      animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                    "></div>`
                  : ''
              }
            </div>
          `,
          iconSize: isLatest ? [30, 30] : [24, 24],
          iconAnchor: isLatest ? [15, 15] : [12, 12],
        });

        const marker = L.marker([pt.latitude, pt.longitude], { icon, zIndexOffset: 1000 + idx }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: monospace; font-size: 11px; color: #fff; background: #0a172e; padding: 8px; border-radius: 6px; min-width: 220px; border: 1px solid ${isLatest ? '#ff0055' : '#00f0ff'};">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 4px;">
              <span style="background: ${isLatest ? '#ff0055' : '#00f0ff'}; color: ${isLatest ? '#fff' : '#000'}; font-weight: bold; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
                CHECKPOINT #${idx + 1} ${isLatest ? '(LATEST)' : ''}
              </span>
              <span style="color: #facc15; font-weight: bold; font-size: 11px;">
                ${pt.speed_kmh} km/h
              </span>
            </div>
            <b style="color: #ffffff; font-size: 12px;">${pt.camera_name || pt.camera_id}</b><br/>
            <span style="color: #94a3b8; font-size: 10px;">ID: ${pt.camera_id.toUpperCase()}</span><br/>
            <div style="margin-top: 4px; padding: 3px 6px; background: #020617; border-radius: 4px; border: 1px solid #1e293b;">
              <span style="color: #38bdf8;">🕒 Time: ${pt.sighted_at || '05:18:00 UTC'}</span><br/>
              <span style="color: #94a3b8; font-size: 10px;">PTS Delta: ${pt.pts_ms || idx * 7000}ms</span>
            </div>
          </div>
        `);

        trajectoryMarkersRef.current.push(marker);
      });
    }
  }, [trajectory]);

  return <div ref={mapContainerRef} className={`w-full ${height} rounded border border-slate-800 relative z-0`} />;
};

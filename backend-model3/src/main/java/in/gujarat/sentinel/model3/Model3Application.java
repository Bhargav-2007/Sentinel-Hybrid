package in.gujarat.sentinel.model3;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Gujarat Sentinel — Model 3: VMS Federation & Middleware
 *
 * <p>Federates heterogeneous Video Management Systems (Hikvision, Dahua, Bosch,
 * Hanwha, Axis, etc.) into a unified RTSP/ONVIF interface with SDK-level
 * camera control (PTZ, preset, playback, event subscription).</p>
 *
 * <h2>Architecture</h2>
 * <pre>
 * ┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
 * │  Gateway /   │────▶│  Federation Service  │────▶│ VMS Adapter │──▶ Hikvision SDK
 * │  Model 1     │     │  (Unified API)       │     │ (Strategy)  │──▶ Dahua SDK
 * └─────────────┘     └──────────────────────┘     │             │──▶ ONVIF Generic
 *                              │                   └─────────────┘
 *                              ▼
 *                     ┌─────────────────┐
 *                     │  PostgreSQL     │  (VMS state, camera mapping)
 *                     │  Kafka          │  (federation events)
 *                     │  Redis          │  (RTSP URL cache)
 *                     └─────────────────┘
 * </pre>
 *
 * <h2>Key Features</h2>
 * <ul>
 *   <li>Vendor-neutral API for camera listing, PTZ control, playback</li>
 *   <li>SDK adapter pattern: each vendor is a pluggable Strategy</li>
 *   <li>ONVIF WS-Discovery for auto-discovery of compliant cameras</li>
 *   <li>RTSP URL construction per vendor SDK format</li>
 *   <li>Health monitoring with automatic reconnection</li>
 *   <li>Event subscription forwarding to Kafka</li>
 * </ul>
 */
@SpringBootApplication
@EnableScheduling
public class Model3Application {

    public static void main(String[] args) {
        SpringApplication.run(Model3Application.class, args);
    }
}

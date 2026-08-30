package in.gujarat.sentinel.model3.controller;

import in.gujarat.sentinel.model3.domain.FederatedCamera;
import in.gujarat.sentinel.model3.domain.VmsConnectionStatus;
import in.gujarat.sentinel.model3.domain.VmsInstance;
import in.gujarat.sentinel.model3.domain.VmsVendorType;
import in.gujarat.sentinel.model3.service.FederationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Federation REST Controller — Unified API for VMS management.
 *
 * <p>Provides vendor-neutral endpoints for managing VMS instances,
 * discovering cameras, PTZ control, playback, and snapshots.</p>
 */
@RestController
@RequestMapping("/api/v1/federation")
@Tag(name = "VMS Federation", description = "Vendor-neutral VMS management API")
@RequiredArgsConstructor
public class FederationController {

    private final FederationService federationService;

    // ── VMS Instance Management ──────────────────────────────────────────

    @GetMapping("/vms")
    @Operation(summary = "List all registered VMS instances")
    public ResponseEntity<Map<String, Object>> listVmsInstances() {
        List<VmsInstance> instances = federationService.listVmsInstances();
        long connected = instances.stream()
                .filter(v -> v.getConnectionStatus() == VmsConnectionStatus.CONNECTED)
                .count();

        return ResponseEntity.ok(Map.of(
                "instances", instances.stream().map(this::vmsToMap).collect(Collectors.toList()),
                "total", instances.size(),
                "connected", connected
        ));
    }

    @PostMapping("/vms")
    @Operation(summary = "Register a new VMS instance")
    public ResponseEntity<Map<String, Object>> registerVms(@RequestBody Map<String, Object> body) {
        VmsInstance vms = VmsInstance.builder()
                .name(String.valueOf(body.getOrDefault("name", "New VMS")))
                .vendorType(VmsVendorType.valueOf(
                        String.valueOf(body.getOrDefault("vendor_type", "HIKVISION")).toUpperCase()))
                .baseUrl(String.valueOf(body.get("base_url")))
                .username(String.valueOf(body.getOrDefault("username", "admin")))
                .password(String.valueOf(body.getOrDefault("password", "")))
                .sdkVersion(String.valueOf(body.getOrDefault("sdk_version", "")))
                .district(String.valueOf(body.getOrDefault("district", "")))
                .department(String.valueOf(body.getOrDefault("department", "")))
                .build();

        VmsInstance saved = federationService.registerVms(vms);
        return ResponseEntity.status(HttpStatus.CREATED).body(vmsToMap(saved));
    }

    @PostMapping("/vms/{vmsId}/discover")
    @Operation(summary = "Re-discover cameras on a VMS")
    public ResponseEntity<Map<String, Object>> discoverCameras(@PathVariable UUID vmsId) {
        // Fetch VMS first
        List<VmsInstance> all = federationService.listVmsInstances();
        VmsInstance vms = all.stream()
                .filter(v -> v.getId().equals(vmsId))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("VMS not found"));

        List<FederatedCamera> cameras = federationService.discoverCameras(vms);
        return ResponseEntity.ok(Map.of(
                "vms_id", vmsId.toString(),
                "discovered", cameras.size()
        ));
    }

    // ── Federated Cameras ────────────────────────────────────────────────

    @GetMapping("/cameras")
    @Operation(summary = "List all federated cameras across all VMS")
    public ResponseEntity<Map<String, Object>> listAllCameras() {
        List<FederatedCamera> cameras = federationService.listAllCameras();
        long online = cameras.stream().filter(FederatedCamera::getIsOnline).count();

        return ResponseEntity.ok(Map.of(
                "cameras", cameras.stream().map(this::cameraToMap).collect(Collectors.toList()),
                "total", cameras.size(),
                "online", online
        ));
    }

    @GetMapping("/vms/{vmsId}/cameras")
    @Operation(summary = "List cameras for a specific VMS")
    public ResponseEntity<Map<String, Object>> listCamerasByVms(@PathVariable UUID vmsId) {
        List<FederatedCamera> cameras = federationService.listCamerasByVms(vmsId);
        return ResponseEntity.ok(Map.of(
                "cameras", cameras.stream().map(this::cameraToMap).collect(Collectors.toList()),
                "total", cameras.size()
        ));
    }

    // ── PTZ Control ──────────────────────────────────────────────────────

    @PostMapping("/cameras/{cameraId}/ptz")
    @Operation(summary = "Send PTZ command to a federated camera")
    public ResponseEntity<Map<String, Object>> sendPtzCommand(
            @PathVariable UUID cameraId,
            @RequestBody Map<String, Object> body) {

        String action = String.valueOf(body.getOrDefault("action", "stop"));
        int speed = Integer.parseInt(String.valueOf(body.getOrDefault("speed", "50")));

        boolean success = federationService.sendPtzCommand(cameraId, action, speed);
        return ResponseEntity.ok(Map.of(
                "camera_id", cameraId.toString(),
                "action", action,
                "speed", speed,
                "success", success
        ));
    }

    @PostMapping("/cameras/{cameraId}/ptz/preset/{presetId}")
    @Operation(summary = "Go to PTZ preset position")
    public ResponseEntity<Map<String, Object>> gotoPtzPreset(
            @PathVariable UUID cameraId,
            @PathVariable int presetId) {

        boolean success = federationService.gotoPtzPreset(cameraId, presetId);
        return ResponseEntity.ok(Map.of("success", success, "preset", presetId));
    }

    // ── Playback ─────────────────────────────────────────────────────────

    @GetMapping("/cameras/{cameraId}/playback")
    @Operation(summary = "Get playback URL for a time range")
    public ResponseEntity<Map<String, Object>> getPlaybackUrl(
            @PathVariable UUID cameraId,
            @RequestParam String startTime,
            @RequestParam String endTime) {

        String url = federationService.getPlaybackUrl(cameraId, startTime, endTime);
        return ResponseEntity.ok(Map.of(
                "camera_id", cameraId.toString(),
                "playback_url", url,
                "start_time", startTime,
                "end_time", endTime
        ));
    }

    // ── Snapshot ──────────────────────────────────────────────────────────

    @GetMapping(value = "/cameras/{cameraId}/snapshot", produces = MediaType.IMAGE_JPEG_VALUE)
    @Operation(summary = "Get camera snapshot (JPEG)")
    public ResponseEntity<byte[]> getSnapshot(@PathVariable UUID cameraId) {
        byte[] snapshot = federationService.getSnapshot(cameraId);
        if (snapshot == null || snapshot.length == 0) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(snapshot);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private Map<String, Object> vmsToMap(VmsInstance v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId().toString());
        m.put("name", v.getName());
        m.put("vendor_type", v.getVendorType().name());
        m.put("base_url", v.getBaseUrl());
        m.put("connection_status", v.getConnectionStatus().name());
        m.put("camera_count", v.getCameraCount());
        m.put("district", v.getDistrict());
        m.put("department", v.getDepartment());
        m.put("sdk_version", v.getSdkVersion());
        m.put("last_connected_at", v.getLastConnectedAt());
        m.put("last_health_check_at", v.getLastHealthCheckAt());
        m.put("error_message", v.getErrorMessage());
        return m;
    }

    private Map<String, Object> cameraToMap(FederatedCamera c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId().toString());
        m.put("vendor_camera_id", c.getVendorCameraId());
        m.put("sentinel_camera_id", c.getSentinelCameraId());
        m.put("name", c.getName());
        m.put("vendor_rtsp_url", c.getVendorRtspUrl());
        m.put("federated_rtsp_url", c.getFederatedRtspUrl());
        m.put("is_online", c.getIsOnline());
        m.put("codec", c.getCodec());
        m.put("resolution", c.getResolution());
        m.put("ptz_supported", c.getPtzSupported());
        m.put("playback_supported", c.getPlaybackSupported());
        m.put("channel_number", c.getChannelNumber());
        if (c.getVmsInstance() != null) {
            m.put("vms_id", c.getVmsInstance().getId().toString());
            m.put("vms_name", c.getVmsInstance().getName());
            m.put("vendor_type", c.getVmsInstance().getVendorType().name());
        }
        return m;
    }
}

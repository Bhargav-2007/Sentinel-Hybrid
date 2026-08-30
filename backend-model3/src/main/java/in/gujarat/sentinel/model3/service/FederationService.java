package in.gujarat.sentinel.model3.service;

import in.gujarat.sentinel.model3.adapter.VmsAdapter;
import in.gujarat.sentinel.model3.domain.*;
import in.gujarat.sentinel.model3.repository.FederatedCameraRepository;
import in.gujarat.sentinel.model3.repository.VmsInstanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Federation Service — Core business logic for VMS federation.
 *
 * <p>Responsibilities:</p>
 * <ul>
 *   <li>Register and manage VMS instances</li>
 *   <li>Discover cameras from each VMS via vendor SDK adapters</li>
 *   <li>Periodic health checks for all connected VMS</li>
 *   <li>Proxy PTZ and playback commands to the correct adapter</li>
 *   <li>Map vendor cameras to Sentinel unified camera IDs</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FederationService {

    private final VmsInstanceRepository vmsRepo;
    private final FederatedCameraRepository cameraRepo;
    private final Map<String, VmsAdapter> adapterRegistry;

    /**
     * Register a new VMS instance and discover its cameras.
     */
    @Transactional
    public VmsInstance registerVms(VmsInstance vms) {
        // Test connection first
        VmsAdapter adapter = getAdapter(vms.getVendorType());
        boolean connected = adapter.testConnection(vms);

        if (connected) {
            vms.setConnectionStatus(VmsConnectionStatus.CONNECTED);
            vms.setLastConnectedAt(Instant.now());
        } else {
            vms.setConnectionStatus(VmsConnectionStatus.ERROR);
            vms.setErrorMessage("Initial connection failed");
        }

        vms = vmsRepo.save(vms);

        // Discover cameras
        if (connected) {
            discoverCameras(vms);
        }

        return vms;
    }

    /**
     * Discover/re-discover cameras on a VMS instance.
     */
    @Transactional
    public List<FederatedCamera> discoverCameras(VmsInstance vms) {
        VmsAdapter adapter = getAdapter(vms.getVendorType());
        List<FederatedCamera> discovered = adapter.discoverCameras(vms);

        // Merge with existing
        for (FederatedCamera cam : discovered) {
            Optional<FederatedCamera> existing = cameraRepo
                    .findByVmsInstanceAndVendorCameraId(vms, cam.getVendorCameraId());

            if (existing.isPresent()) {
                FederatedCamera ex = existing.get();
                ex.setName(cam.getName());
                ex.setVendorRtspUrl(cam.getVendorRtspUrl());
                ex.setIsOnline(cam.getIsOnline());
                ex.setCodec(cam.getCodec());
                ex.setResolution(cam.getResolution());
                ex.setPtzSupported(cam.getPtzSupported());
                cameraRepo.save(ex);
            } else {
                cam.setVmsInstance(vms);
                cameraRepo.save(cam);
            }
        }

        // Update camera count
        vms.setCameraCount(discovered.size());
        vmsRepo.save(vms);

        log.info("Discovered {} cameras on VMS {} ({})",
                discovered.size(), vms.getName(), vms.getVendorType());

        return discovered;
    }

    /**
     * List all VMS instances.
     */
    @Transactional(readOnly = true)
    public List<VmsInstance> listVmsInstances() {
        return vmsRepo.findAll();
    }

    /**
     * Get all cameras across all federated VMS.
     */
    @Transactional(readOnly = true)
    public List<FederatedCamera> listAllCameras() {
        return cameraRepo.findAll();
    }

    /**
     * Get cameras for a specific VMS.
     */
    @Transactional(readOnly = true)
    public List<FederatedCamera> listCamerasByVms(UUID vmsId) {
        VmsInstance vms = vmsRepo.findById(vmsId)
                .orElseThrow(() -> new NoSuchElementException("VMS not found: " + vmsId));
        return cameraRepo.findByVmsInstance(vms);
    }

    /**
     * Send PTZ command to a federated camera.
     */
    public boolean sendPtzCommand(UUID cameraId, String action, int speed) {
        FederatedCamera camera = cameraRepo.findById(cameraId)
                .orElseThrow(() -> new NoSuchElementException("Camera not found: " + cameraId));

        if (!camera.getPtzSupported()) {
            throw new UnsupportedOperationException("Camera does not support PTZ");
        }

        VmsInstance vms = camera.getVmsInstance();
        VmsAdapter adapter = getAdapter(vms.getVendorType());
        return adapter.sendPtzCommand(vms, camera, action, speed);
    }

    /**
     * Go to PTZ preset on a federated camera.
     */
    public boolean gotoPtzPreset(UUID cameraId, int presetId) {
        FederatedCamera camera = cameraRepo.findById(cameraId)
                .orElseThrow(() -> new NoSuchElementException("Camera not found"));
        VmsInstance vms = camera.getVmsInstance();
        VmsAdapter adapter = getAdapter(vms.getVendorType());
        return adapter.gotoPtzPreset(vms, camera, presetId);
    }

    /**
     * Get playback URL for a federated camera.
     */
    public String getPlaybackUrl(UUID cameraId, String startTime, String endTime) {
        FederatedCamera camera = cameraRepo.findById(cameraId)
                .orElseThrow(() -> new NoSuchElementException("Camera not found"));
        VmsInstance vms = camera.getVmsInstance();
        VmsAdapter adapter = getAdapter(vms.getVendorType());
        return adapter.getPlaybackUrl(vms, camera, startTime, endTime);
    }

    /**
     * Get snapshot from a federated camera.
     */
    public byte[] getSnapshot(UUID cameraId) {
        FederatedCamera camera = cameraRepo.findById(cameraId)
                .orElseThrow(() -> new NoSuchElementException("Camera not found"));
        VmsInstance vms = camera.getVmsInstance();
        VmsAdapter adapter = getAdapter(vms.getVendorType());
        return adapter.getSnapshot(vms, camera);
    }

    /**
     * Periodic health check for all connected VMS.
     * Runs every 30 seconds.
     */
    @Scheduled(fixedDelayString = "${sentinel.federation.health-check-interval-ms:30000}")
    @Transactional
    public void healthCheckAll() {
        List<VmsInstance> instances = vmsRepo.findAll();
        for (VmsInstance vms : instances) {
            try {
                VmsAdapter adapter = getAdapter(vms.getVendorType());
                boolean connected = adapter.testConnection(vms);

                if (connected) {
                    vms.setConnectionStatus(VmsConnectionStatus.CONNECTED);
                    vms.setLastConnectedAt(Instant.now());
                    vms.setErrorMessage(null);
                } else {
                    vms.setConnectionStatus(VmsConnectionStatus.ERROR);
                    vms.setErrorMessage("Health check failed");
                }
                vms.setLastHealthCheckAt(Instant.now());
                vmsRepo.save(vms);

            } catch (Exception e) {
                log.warn("Health check failed for VMS {}: {}", vms.getName(), e.getMessage());
                vms.setConnectionStatus(VmsConnectionStatus.ERROR);
                vms.setErrorMessage(e.getMessage());
                vms.setLastHealthCheckAt(Instant.now());
                vmsRepo.save(vms);
            }
        }
    }

    /**
     * Get the correct adapter for a vendor type.
     */
    private VmsAdapter getAdapter(VmsVendorType vendorType) {
        String beanName = switch (vendorType) {
            case HIKVISION -> "hikvisionAdapter";
            case DAHUA -> "dahuaAdapter";
            default -> "hikvisionAdapter"; // Fallback to Hikvision (ONVIF-like)
        };
        VmsAdapter adapter = adapterRegistry.get(beanName);
        if (adapter == null) {
            throw new UnsupportedOperationException("No adapter for vendor: " + vendorType);
        }
        return adapter;
    }
}

package in.gujarat.sentinel.model3.adapter;

import in.gujarat.sentinel.model3.domain.FederatedCamera;
import in.gujarat.sentinel.model3.domain.VmsInstance;

import java.util.List;
import java.util.Map;

/**
 * Strategy interface for VMS vendor SDK adapters.
 *
 * <p>Each vendor (Hikvision, Dahua, ONVIF, etc.) implements this interface
 * to provide a unified API for camera discovery, PTZ control, playback,
 * and event subscription.</p>
 *
 * <p>Implementation pattern follows the Strategy design pattern:
 * the {@link in.gujarat.sentinel.model3.service.FederationService} selects
 * the correct adapter based on {@link in.gujarat.sentinel.model3.domain.VmsVendorType}.</p>
 */
public interface VmsAdapter {

    /**
     * Test connectivity to the VMS server.
     * @return true if the VMS is reachable and credentials are valid
     */
    boolean testConnection(VmsInstance vms);

    /**
     * Discover all cameras/channels on the VMS.
     * Maps vendor-specific camera data to our FederatedCamera model.
     */
    List<FederatedCamera> discoverCameras(VmsInstance vms);

    /**
     * Construct the RTSP URL for a specific camera/channel.
     * Each vendor has a different URL format:
     *   - Hikvision: rtsp://user:pass@host:554/Streaming/Channels/101
     *   - Dahua: rtsp://user:pass@host:554/cam/realmonitor?channel=1&subtype=0
     *   - ONVIF: Uses GetStreamUri SOAP call
     */
    String constructRtspUrl(VmsInstance vms, FederatedCamera camera);

    /**
     * Send PTZ command to a camera.
     * @param action PTZ action (pan_left, pan_right, tilt_up, tilt_down, zoom_in, zoom_out, stop)
     * @param speed Speed 1-100
     */
    boolean sendPtzCommand(VmsInstance vms, FederatedCamera camera, String action, int speed);

    /**
     * Go to a PTZ preset position.
     */
    boolean gotoPtzPreset(VmsInstance vms, FederatedCamera camera, int presetId);

    /**
     * Get recording/playback URL for a time range.
     * @return RTSP playback URL or null if not supported
     */
    String getPlaybackUrl(VmsInstance vms, FederatedCamera camera,
                          String startTime, String endTime);

    /**
     * Get camera snapshot (JPEG bytes).
     */
    byte[] getSnapshot(VmsInstance vms, FederatedCamera camera);

    /**
     * Get device information from the VMS.
     */
    Map<String, Object> getDeviceInfo(VmsInstance vms);
}

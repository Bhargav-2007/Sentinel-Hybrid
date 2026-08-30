package in.gujarat.sentinel.model3.adapter;

import in.gujarat.sentinel.model3.domain.FederatedCamera;
import in.gujarat.sentinel.model3.domain.VmsInstance;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URI;
import java.time.Duration;
import java.util.*;

/**
 * Hikvision VMS SDK Adapter.
 *
 * <p>Implements the Hikvision ISAPI (IP Surveillance API) protocol for:</p>
 * <ul>
 *   <li>Camera discovery via ISAPI /System/Video/inputs/channels</li>
 *   <li>RTSP URL: rtsp://user:pass@host:554/Streaming/Channels/{channel}01</li>
 *   <li>PTZ control via ISAPI /PTZCtrl/channels/{channel}/continuous</li>
 *   <li>Snapshot via ISAPI /Streaming/channels/{channel}/picture</li>
 *   <li>Playback via rtsp://user:pass@host:554/Streaming/tracks/{track}?starttime=...&endtime=...</li>
 * </ul>
 *
 * <p>In the hackathon demo, this adapter connects to mock-vms-a which
 * simulates Hikvision ISAPI responses.</p>
 */
@Slf4j
@Component("hikvisionAdapter")
public class HikvisionAdapter implements VmsAdapter {

    private final WebClient.Builder webClientBuilder;

    public HikvisionAdapter(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    public boolean testConnection(VmsInstance vms) {
        try {
            WebClient client = buildClient(vms);
            var response = client.get()
                    .uri("/ISAPI/System/deviceInfo")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
            return response != null;
        } catch (Exception e) {
            log.warn("Hikvision connection test failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<FederatedCamera> discoverCameras(VmsInstance vms) {
        List<FederatedCamera> cameras = new ArrayList<>();

        try {
            WebClient client = buildClient(vms);
            var response = client.get()
                    .uri("/ISAPI/System/Video/inputs/channels")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (response == null) return cameras;

            // Parse Hikvision channel list
            var channelList = (List<Map<String, Object>>) response.getOrDefault("channels", List.of());
            if (channelList.isEmpty()) {
                // Mock response fallback
                channelList = (List<Map<String, Object>>) response.getOrDefault("VideoInputChannelList", List.of());
            }

            for (var channel : channelList) {
                String channelId = String.valueOf(channel.getOrDefault("id", channel.getOrDefault("channelId", "")));
                String name = String.valueOf(channel.getOrDefault("name", channel.getOrDefault("channelName", "Camera " + channelId)));
                boolean online = Boolean.parseBoolean(String.valueOf(channel.getOrDefault("online", "true")));

                FederatedCamera cam = FederatedCamera.builder()
                        .vmsInstance(vms)
                        .vendorCameraId(channelId)
                        .name(name)
                        .channelNumber(parseIntSafe(channelId))
                        .isOnline(online)
                        .codec("h264")
                        .resolution(String.valueOf(channel.getOrDefault("resolution", "1920x1080")))
                        .ptzSupported(Boolean.parseBoolean(String.valueOf(channel.getOrDefault("ptzSupported", "false"))))
                        .playbackSupported(true)
                        .build();

                // Construct RTSP URL
                cam.setVendorRtspUrl(constructRtspUrl(vms, cam));
                cameras.add(cam);
            }

            log.info("Hikvision discovery: found {} cameras on {}", cameras.size(), vms.getName());

        } catch (Exception e) {
            log.error("Hikvision discovery failed for {}: {}", vms.getName(), e.getMessage());
        }

        return cameras;
    }

    @Override
    public String constructRtspUrl(VmsInstance vms, FederatedCamera camera) {
        // Hikvision RTSP format: rtsp://user:pass@host:554/Streaming/Channels/{channel}01
        URI uri = URI.create(vms.getBaseUrl());
        String host = uri.getHost();
        int channel = camera.getChannelNumber() != null ? camera.getChannelNumber() : 1;
        return String.format("rtsp://%s:%s@%s:554/Streaming/Channels/%d01",
                vms.getUsername(), vms.getPassword(), host, channel);
    }

    @Override
    public boolean sendPtzCommand(VmsInstance vms, FederatedCamera camera, String action, int speed) {
        try {
            WebClient client = buildClient(vms);
            int channel = camera.getChannelNumber() != null ? camera.getChannelNumber() : 1;

            Map<String, Object> ptzData = buildPtzPayload(action, speed);

            client.put()
                    .uri("/ISAPI/PTZCtrl/channels/{channel}/continuous", channel)
                    .bodyValue(ptzData)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .timeout(Duration.ofSeconds(3))
                    .block();

            log.debug("Hikvision PTZ {} on channel {} (speed={})", action, channel, speed);
            return true;
        } catch (Exception e) {
            log.warn("Hikvision PTZ failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public boolean gotoPtzPreset(VmsInstance vms, FederatedCamera camera, int presetId) {
        try {
            WebClient client = buildClient(vms);
            int channel = camera.getChannelNumber() != null ? camera.getChannelNumber() : 1;

            client.put()
                    .uri("/ISAPI/PTZCtrl/channels/{channel}/presets/{preset}/goto", channel, presetId)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .timeout(Duration.ofSeconds(3))
                    .block();

            return true;
        } catch (Exception e) {
            log.warn("Hikvision preset goto failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public String getPlaybackUrl(VmsInstance vms, FederatedCamera camera,
                                  String startTime, String endTime) {
        URI uri = URI.create(vms.getBaseUrl());
        String host = uri.getHost();
        int channel = camera.getChannelNumber() != null ? camera.getChannelNumber() : 1;
        return String.format(
                "rtsp://%s:%s@%s:554/Streaming/tracks/%d01?starttime=%s&endtime=%s",
                vms.getUsername(), vms.getPassword(), host, channel,
                startTime.replace(":", ""), endTime.replace(":", ""));
    }

    @Override
    public byte[] getSnapshot(VmsInstance vms, FederatedCamera camera) {
        try {
            WebClient client = buildClient(vms);
            int channel = camera.getChannelNumber() != null ? camera.getChannelNumber() : 1;

            return client.get()
                    .uri("/ISAPI/Streaming/channels/{channel}01/picture", channel)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
        } catch (Exception e) {
            log.warn("Hikvision snapshot failed: {}", e.getMessage());
            return new byte[0];
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDeviceInfo(VmsInstance vms) {
        try {
            WebClient client = buildClient(vms);
            return client.get()
                    .uri("/ISAPI/System/deviceInfo")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private WebClient buildClient(VmsInstance vms) {
        return webClientBuilder
                .baseUrl(vms.getBaseUrl())
                .defaultHeaders(h -> h.setBasicAuth(
                        vms.getUsername() != null ? vms.getUsername() : "",
                        vms.getPassword() != null ? vms.getPassword() : ""))
                .build();
    }

    private Map<String, Object> buildPtzPayload(String action, int speed) {
        // Hikvision PTZ continuous move format
        int panSpeed = 0, tiltSpeed = 0, zoomSpeed = 0;
        switch (action.toLowerCase()) {
            case "pan_left" -> panSpeed = -speed;
            case "pan_right" -> panSpeed = speed;
            case "tilt_up" -> tiltSpeed = speed;
            case "tilt_down" -> tiltSpeed = -speed;
            case "zoom_in" -> zoomSpeed = speed;
            case "zoom_out" -> zoomSpeed = -speed;
            case "stop" -> {} // All zeros
        }
        return Map.of(
                "panSpeed", panSpeed,
                "tiltSpeed", tiltSpeed,
                "zoomSpeed", zoomSpeed
        );
    }

    private int parseIntSafe(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return 1;
        }
    }
}

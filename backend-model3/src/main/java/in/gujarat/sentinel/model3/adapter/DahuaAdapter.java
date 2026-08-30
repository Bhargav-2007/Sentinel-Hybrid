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
 * Dahua VMS SDK Adapter.
 *
 * <p>Implements the Dahua DSS (Digital Surveillance System) API for:</p>
 * <ul>
 *   <li>Camera discovery via /api/v1/devices</li>
 *   <li>RTSP URL: rtsp://user:pass@host:554/cam/realmonitor?channel={ch}&subtype=0</li>
 *   <li>PTZ via /api/v1/ptz/continuous</li>
 *   <li>Playback via /api/v1/playback/uri</li>
 * </ul>
 */
@Slf4j
@Component("dahuaAdapter")
public class DahuaAdapter implements VmsAdapter {

    private final WebClient.Builder webClientBuilder;

    public DahuaAdapter(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    public boolean testConnection(VmsInstance vms) {
        try {
            WebClient client = buildClient(vms);
            var response = client.get()
                    .uri("/api/v1/system/info")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
            return response != null;
        } catch (Exception e) {
            log.warn("Dahua connection test failed: {}", e.getMessage());
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
                    .uri("/api/v1/devices")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (response == null) return cameras;

            var deviceList = (List<Map<String, Object>>) response.getOrDefault("devices", List.of());

            for (var device : deviceList) {
                String deviceId = String.valueOf(device.getOrDefault("id", ""));
                String name = String.valueOf(device.getOrDefault("name", "Dahua Camera " + deviceId));

                // Each device may have multiple channels
                var channels = (List<Map<String, Object>>) device.getOrDefault("channels", List.of(Map.of("id", deviceId)));

                for (var ch : channels) {
                    String chId = String.valueOf(ch.getOrDefault("id", deviceId));
                    int chNum = parseIntSafe(chId);

                    FederatedCamera cam = FederatedCamera.builder()
                            .vmsInstance(vms)
                            .vendorCameraId(deviceId + "-" + chId)
                            .name(name + " Ch" + chNum)
                            .channelNumber(chNum)
                            .isOnline(Boolean.parseBoolean(String.valueOf(device.getOrDefault("online", "true"))))
                            .codec("h264")
                            .resolution("1920x1080")
                            .ptzSupported(Boolean.parseBoolean(String.valueOf(device.getOrDefault("ptzSupported", "false"))))
                            .playbackSupported(true)
                            .build();

                    cam.setVendorRtspUrl(constructRtspUrl(vms, cam));
                    cameras.add(cam);
                }
            }

            log.info("Dahua discovery: found {} cameras on {}", cameras.size(), vms.getName());

        } catch (Exception e) {
            log.error("Dahua discovery failed for {}: {}", vms.getName(), e.getMessage());
        }

        return cameras;
    }

    @Override
    public String constructRtspUrl(VmsInstance vms, FederatedCamera camera) {
        // Dahua RTSP format: rtsp://user:pass@host:554/cam/realmonitor?channel={ch}&subtype=0
        URI uri = URI.create(vms.getBaseUrl());
        String host = uri.getHost();
        int channel = camera.getChannelNumber() != null ? camera.getChannelNumber() : 1;
        return String.format("rtsp://%s:%s@%s:554/cam/realmonitor?channel=%d&subtype=0",
                vms.getUsername(), vms.getPassword(), host, channel);
    }

    @Override
    public boolean sendPtzCommand(VmsInstance vms, FederatedCamera camera, String action, int speed) {
        try {
            WebClient client = buildClient(vms);
            int channel = camera.getChannelNumber() != null ? camera.getChannelNumber() : 1;

            client.post()
                    .uri("/api/v1/ptz/continuous")
                    .bodyValue(Map.of(
                            "channel", channel,
                            "action", action,
                            "speed", speed
                    ))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .timeout(Duration.ofSeconds(3))
                    .block();

            return true;
        } catch (Exception e) {
            log.warn("Dahua PTZ failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public boolean gotoPtzPreset(VmsInstance vms, FederatedCamera camera, int presetId) {
        try {
            WebClient client = buildClient(vms);
            client.post()
                    .uri("/api/v1/ptz/preset/goto")
                    .bodyValue(Map.of("channel", camera.getChannelNumber(), "preset", presetId))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .timeout(Duration.ofSeconds(3))
                    .block();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String getPlaybackUrl(VmsInstance vms, FederatedCamera camera,
                                  String startTime, String endTime) {
        URI uri = URI.create(vms.getBaseUrl());
        int channel = camera.getChannelNumber() != null ? camera.getChannelNumber() : 1;
        return String.format("rtsp://%s:%s@%s:554/cam/playback?channel=%d&starttime=%s&endtime=%s",
                vms.getUsername(), vms.getPassword(), uri.getHost(), channel, startTime, endTime);
    }

    @Override
    public byte[] getSnapshot(VmsInstance vms, FederatedCamera camera) {
        try {
            WebClient client = buildClient(vms);
            int channel = camera.getChannelNumber() != null ? camera.getChannelNumber() : 1;
            return client.get()
                    .uri("/api/v1/snapshot?channel={ch}", channel)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
        } catch (Exception e) {
            return new byte[0];
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDeviceInfo(VmsInstance vms) {
        try {
            WebClient client = buildClient(vms);
            return client.get()
                    .uri("/api/v1/system/info")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }

    private WebClient buildClient(VmsInstance vms) {
        return webClientBuilder
                .baseUrl(vms.getBaseUrl())
                .defaultHeaders(h -> h.setBasicAuth(
                        vms.getUsername() != null ? vms.getUsername() : "",
                        vms.getPassword() != null ? vms.getPassword() : ""))
                .build();
    }

    private int parseIntSafe(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return 1;
        }
    }
}

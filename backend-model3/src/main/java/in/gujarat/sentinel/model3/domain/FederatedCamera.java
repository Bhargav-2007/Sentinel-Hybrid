package in.gujarat.sentinel.model3.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * A camera discovered from a federated VMS.
 *
 * <p>Maps vendor-specific camera identifiers to Sentinel's unified
 * camera ID scheme. Stores the vendor RTSP URL and provides
 * the unified RTSP proxy URL.</p>
 */
@Entity
@Table(name = "federated_cameras",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"vmsInstanceId", "vendorCameraId"}
    ))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FederatedCamera {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Parent VMS instance */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vms_instance_id", nullable = false)
    private VmsInstance vmsInstance;

    /** Sentinel unified camera ID (e.g., HOME-AHM-001) */
    @Column(length = 64)
    private String sentinelCameraId;

    /** Vendor-specific camera/channel ID */
    @Column(nullable = false, length = 100)
    private String vendorCameraId;

    /** Camera name from vendor VMS */
    @Column(nullable = false, length = 200)
    private String name;

    /** Vendor RTSP URL (direct from VMS) */
    @Column(length = 500)
    private String vendorRtspUrl;

    /** Unified RTSP proxy URL (via federation) */
    @Column(length = 500)
    private String federatedRtspUrl;

    /** ONVIF profile token (if ONVIF-compliant) */
    @Column(length = 100)
    private String onvifProfileToken;

    /** Camera channel number on the NVR */
    @Column
    private Integer channelNumber;

    /** Whether the camera is online */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isOnline = false;

    /** Camera codec */
    @Column(length = 20)
    private String codec;

    /** Resolution */
    @Column(length = 20)
    private String resolution;

    /** Whether PTZ is supported */
    @Column(nullable = false)
    @Builder.Default
    private Boolean ptzSupported = false;

    /** Whether playback/recording retrieval is supported */
    @Column(nullable = false)
    @Builder.Default
    private Boolean playbackSupported = false;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }
}

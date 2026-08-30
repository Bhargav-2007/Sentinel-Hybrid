package in.gujarat.sentinel.model3.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Represents a registered VMS (Video Management System) vendor instance.
 *
 * <p>Each VMS is a distinct server (e.g., a Hikvision NVR at a police station,
 * a Dahua DSS cluster at the district HQ). The federation layer connects to
 * each VMS to discover cameras and proxy SDK operations.</p>
 */
@Entity
@Table(name = "vms_instances")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VmsInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Display name (e.g., "Ahmedabad Police NVR-01") */
    @Column(nullable = false, length = 200)
    private String name;

    /** Vendor type identifier */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private VmsVendorType vendorType;

    /** VMS server base URL (e.g., http://192.168.1.100:80) */
    @Column(nullable = false, length = 500)
    private String baseUrl;

    /** SDK/API username */
    @Column(length = 100)
    private String username;

    /** SDK/API password (encrypted in production) */
    @Column(length = 200)
    private String password;

    /** SDK version for protocol negotiation */
    @Column(length = 50)
    private String sdkVersion;

    /** Current connection status */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private VmsConnectionStatus connectionStatus = VmsConnectionStatus.DISCONNECTED;

    /** Number of cameras discovered on this VMS */
    @Column
    @Builder.Default
    private Integer cameraCount = 0;

    /** District this VMS serves */
    @Column(length = 100)
    private String district;

    /** Department that owns this VMS */
    @Column(length = 20)
    private String department;

    /** Last successful connection time */
    @Column
    private Instant lastConnectedAt;

    /** Last health check time */
    @Column
    private Instant lastHealthCheckAt;

    /** Error message if connection failed */
    @Column(length = 500)
    private String errorMessage;

    /** Additional metadata */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

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

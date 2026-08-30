-- Gujarat Sentinel — Model 3 Flyway Migration
-- V1: VMS Federation Tables

CREATE TABLE vms_instances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    vendor_type     VARCHAR(30) NOT NULL,
    base_url        VARCHAR(500) NOT NULL,
    username        VARCHAR(100),
    password        VARCHAR(200),
    sdk_version     VARCHAR(50),
    connection_status VARCHAR(20) NOT NULL DEFAULT 'DISCONNECTED',
    camera_count    INTEGER DEFAULT 0,
    district        VARCHAR(100),
    department      VARCHAR(20),
    last_connected_at TIMESTAMPTZ,
    last_health_check_at TIMESTAMPTZ,
    error_message   VARCHAR(500),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE federated_cameras (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vms_instance_id UUID NOT NULL REFERENCES vms_instances(id) ON DELETE CASCADE,
    sentinel_camera_id VARCHAR(64),
    vendor_camera_id VARCHAR(100) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    vendor_rtsp_url VARCHAR(500),
    federated_rtsp_url VARCHAR(500),
    onvif_profile_token VARCHAR(100),
    channel_number  INTEGER,
    is_online       BOOLEAN NOT NULL DEFAULT false,
    codec           VARCHAR(20),
    resolution      VARCHAR(20),
    ptz_supported   BOOLEAN NOT NULL DEFAULT false,
    playback_supported BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (vms_instance_id, vendor_camera_id)
);

CREATE INDEX idx_fed_cameras_vms ON federated_cameras(vms_instance_id);
CREATE INDEX idx_fed_cameras_sentinel ON federated_cameras(sentinel_camera_id);
CREATE INDEX idx_fed_cameras_online ON federated_cameras(is_online);

-- Seed demo VMS instances
INSERT INTO vms_instances (name, vendor_type, base_url, username, password, sdk_version, district, department, connection_status) VALUES
('Ahmedabad Police HQ NVR', 'HIKVISION', 'http://mock-vms-a:9001', 'admin', 'admin123', '6.1.9.4', 'Ahmedabad', 'HOME', 'DISCONNECTED'),
('Surat Smart City DSS', 'DAHUA', 'http://mock-vms-b:9002', 'admin', 'admin123', '3.054.0000001', 'Surat', 'HOME', 'DISCONNECTED');

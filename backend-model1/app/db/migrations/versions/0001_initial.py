"""
Gujarat Sentinel — Model 1
Alembic Initial Migration

Creates all tables with PostGIS extensions:
  - departments
  - cameras (with PostGIS Point geometry + spatial index)
  - camera_health_checks
  - audit_trail
  - coverage_zones

All enums are created as PostgreSQL ENUMs for type safety.
"""

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

# revision identifiers
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── PostgreSQL extensions ───────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # ── Enums ────────────────────────────────────────────────────────────────
    camera_status_enum = sa.Enum(
        "online", "offline", "degraded", "maintenance", "decommissioned", "unknown",
        name="camera_status_enum",
    )
    camera_type_enum = sa.Enum(
        "dome", "bullet", "ptz", "fisheye", "thermal", "box", "analogue_ip_converter",
        name="camera_type_enum",
    )
    storage_type_enum = sa.Enum(
        "cloud", "local_nvr", "edge_device", "no_storage",
        name="storage_type_enum",
    )
    protocol_enum = sa.Enum(
        "rtsp", "onvif", "sdk", "http_mjpeg", "hls", "rtmp", "webrtc",
        name="protocol_enum",
    )
    codec_enum = sa.Enum(
        "h264", "h265", "mjpeg", "mpeg4", "av1",
        name="codec_enum",
    )
    audit_action_enum = sa.Enum(
        "create", "update", "delete", "bulk_import", "health_check", "status_change",
        name="audit_action_enum",
    )

    for enum in [camera_status_enum, camera_type_enum, storage_type_enum,
                 protocol_enum, codec_enum, audit_action_enum]:
        enum.create(op.get_bind(), checkfirst=True)

    # ── departments ───────────────────────────────────────────────────────────
    op.create_table(
        "departments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(20), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("contact_email", sa.String(254), nullable=True),
        sa.Column("contact_phone", sa.String(20), nullable=True),
        sa.Column("metadata", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )

    # ── cameras ───────────────────────────────────────────────────────────────
    op.create_table(
        "cameras",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("camera_id", sa.String(64), nullable=False, unique=True),
        sa.Column("department_id", UUID(as_uuid=True),
                  sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        # PostGIS geometry column
        sa.Column("location", Geometry("POINT", srid=4326), nullable=False),
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("altitude_meters", sa.Float, nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("district", sa.String(100), nullable=True),
        sa.Column("taluka", sa.String(100), nullable=True),
        sa.Column("pincode", sa.String(6), nullable=True),
        sa.Column("camera_type", camera_type_enum, nullable=False),
        sa.Column("protocol", protocol_enum, nullable=True),
        sa.Column("codec", codec_enum, nullable=True),
        sa.Column("resolution", sa.String(20), nullable=True),
        sa.Column("frame_rate", sa.Integer, nullable=True),
        sa.Column("rtsp_url", sa.Text, nullable=True),
        sa.Column("onvif_url", sa.Text, nullable=True),
        sa.Column("vendor", sa.String(100), nullable=True),
        sa.Column("model_number", sa.String(100), nullable=True),
        sa.Column("install_date", sa.Date, nullable=True),
        sa.Column("amc_expiry_date", sa.Date, nullable=True),
        sa.Column("storage_type", storage_type_enum, nullable=True),
        sa.Column("retention_days", sa.Integer, nullable=True),
        sa.Column("status", camera_status_enum, nullable=False,
                  server_default="unknown"),
        sa.Column("last_health_check_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_public_domain", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("tags", ARRAY(sa.String), nullable=False, server_default="{}"),
        sa.Column("metadata", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by", sa.String(100), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Spatial index for GIS queries
    op.create_index(
        "idx_cameras_location_gist",
        "cameras",
        ["location"],
        postgresql_using="gist",
    )
    op.create_index("idx_cameras_district", "cameras", ["district"])
    op.create_index("idx_cameras_status_active", "cameras", ["status", "deleted_at"])
    op.create_index("idx_cameras_department", "cameras", ["department_id"])
    op.create_index("idx_cameras_amc_expiry", "cameras", ["amc_expiry_date"])

    # ── camera_health_checks ───────────────────────────────────────────────────
    op.create_table(
        "camera_health_checks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("camera_id", UUID(as_uuid=True),
                  sa.ForeignKey("cameras.id"), nullable=False),
        sa.Column("is_reachable", sa.Boolean, nullable=False),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column("stream_active", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("check_method", sa.String(20), nullable=False),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("checked_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "idx_health_camera_checked_at",
        "camera_health_checks",
        ["camera_id", "checked_at"],
    )

    # ── audit_trail ───────────────────────────────────────────────────────────
    op.create_table(
        "audit_trail",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=False),
        sa.Column("action", audit_action_enum, nullable=False),
        sa.Column("actor_id", sa.String(100), nullable=False),
        sa.Column("actor_ip", sa.String(45), nullable=True),
        sa.Column("diff", JSONB, nullable=False, server_default="{}"),
        sa.Column("context", JSONB, nullable=False, server_default="{}"),
        sa.Column("timestamp", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "idx_audit_entity_timestamp",
        "audit_trail",
        ["entity_type", "entity_id", "timestamp"],
    )
    op.create_index("idx_audit_actor_timestamp", "audit_trail", ["actor_id", "timestamp"])

    # ── coverage_zones ────────────────────────────────────────────────────────
    op.create_table(
        "coverage_zones",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("zone_type", sa.String(50), nullable=False),
        sa.Column("district", sa.String(100), nullable=True),
        sa.Column("boundary", Geometry("GEOMETRY", srid=4326), nullable=False),
        sa.Column("priority", sa.String(20), server_default="medium"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "idx_zones_boundary_gist",
        "coverage_zones",
        ["boundary"],
        postgresql_using="gist",
    )

    # ── Seed initial Gujarat departments ──────────────────────────────────────
    op.execute("""
        INSERT INTO departments (code, name, contact_email) VALUES
        ('HOME',  'Home Department (Police)', 'home.dept@gujarat.gov.in'),
        ('RTO',   'Regional Transport Office', 'rto@gujarat.gov.in'),
        ('FOOD',  'Food & Civil Supplies', 'food.dept@gujarat.gov.in'),
        ('MC',    'Municipal Corporation', 'mc@gujarat.gov.in'),
        ('PWD',   'Public Works Department', 'pwd@gujarat.gov.in'),
        ('NHAI',  'National Highways Authority', 'nhai@gujarat.gov.in'),
        ('GSRTC', 'Gujarat State Road Transport Corporation', 'gsrtc@gujarat.gov.in'),
        ('METRO', 'Metro Rail Corporation', 'metro@gujarat.gov.in'),
        ('PORT',  'Port Authority', 'port@gujarat.gov.in'),
        ('AIRPORT','Airport Authority', 'airport@gujarat.gov.in'),
        ('RAILWAY','Indian Railways (Gujarat Zone)', 'railway@gujarat.gov.in'),
        ('EDUC',  'Education Department', 'education@gujarat.gov.in'),
        ('HEALTH','Health Department', 'health@gujarat.gov.in'),
        ('AGRI',  'Agriculture Department', 'agri@gujarat.gov.in'),
        ('FOREST','Forest Department', 'forest@gujarat.gov.in')
        ON CONFLICT (code) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table("coverage_zones")
    op.drop_table("audit_trail")
    op.drop_table("camera_health_checks")
    op.drop_table("cameras")
    op.drop_table("departments")

    for enum_name in [
        "audit_action_enum", "codec_enum", "protocol_enum",
        "storage_type_enum", "camera_type_enum", "camera_status_enum",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")

"""Cybersecurity Audit Logging and Section 65B Indian Evidence Act Compliance models."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    """
    Immutable audit trail recording all officer queries, video wall feed access,
    watchlist additions, alert acknowledgements, and PTZ actions.
    Stamped with SHA-256 HMAC for Section 65B Indian Evidence Act compliance.
    """
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    officer_id = Column(String(64), ForeignKey("officers.id"), index=True, nullable=False)
    officer_badge = Column(String(64), index=True, nullable=False)
    action = Column(String(64), index=True, nullable=False) # LOGIN, BREAK_GLASS, VIEW_STREAM, PTZ_MOVE, EXPORT_EVIDENCE, ACK_ALERT
    
    entity_type = Column(String(64), nullable=False)        # CAMERA, ALERT, WATCHLIST, OFFICER, STREAM
    entity_id = Column(String(64), nullable=False)
    
    ip_address = Column(String(64), nullable=False)
    user_agent = Column(String(256), nullable=True)
    
    # Audit Context & Section 65B Cryptographic Stamp
    details = Column(JSON, default=dict)
    digital_signature_hmac = Column(String(128), nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    officer = relationship("Officer", back_populates="audit_logs")


class BreakGlassSession(Base):
    """
    Emergency Break-Glass protocol record.
    Allows duty officers to temporarily access restricted district feeds or high-security
    surveillance zones with mandatory justification and real-time supervisor logging.
    """
    __tablename__ = "break_glass_sessions"

    id = Column(String(64), primary_key=True, index=True)
    officer_id = Column(String(64), ForeignKey("officers.id"), index=True, nullable=False)
    
    reason = Column(Text, nullable=False)                  # Mandatory operational justification
    fir_number = Column(String(64), nullable=True)         # Associated FIR/Crime Diary entry
    scope_district = Column(String(64), nullable=False)    # e.g. "Ahmedabad City" or "ALL_GUJARAT"
    
    is_active = Column(Boolean, default=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    officer = relationship("Officer", back_populates="break_glass_sessions")

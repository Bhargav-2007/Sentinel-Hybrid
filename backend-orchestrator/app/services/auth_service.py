"""Authentication, Officer authorization, and Break-Glass privilege escalation service."""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, generate_section65b_hmac
from app.models.officer import Officer, OfficerRole
from app.models.audit import BreakGlassSession
from app.schemas.auth import LoginRequest, TokenResponse, BreakGlassRequest, BreakGlassResponse
from app.services.audit_service import audit_service


class AuthService:
    """Handles officer authentication, badge identification, JWT issuance, and Break-Glass access."""

    async def authenticate_officer(self, db: AsyncSession, login_data: LoginRequest, ip_address: str = "127.0.0.1") -> TokenResponse:
        """Validates officer credentials and issues a signed JWT token."""
        stmt = select(Officer).where(Officer.officer_id == login_data.officer_id)
        res = await db.execute(stmt)
        officer = res.scalars().first()

        # If officer doesn't exist, create a default officer account for smooth hackathon testing
        if not officer:
            officer = await self._create_default_officer(db, login_data.officer_id, login_data.password)

        if not verify_password(login_data.password, officer.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Officer ID or Security Password. Authentication failed.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not officer.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Officer account is suspended. Contact State Cyber Command.",
            )

        # Update last login
        officer.last_login = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(officer)

        # Audit log the successful login
        await audit_service.log_action(
            db=db,
            officer=officer,
            action="OFFICER_LOGIN",
            entity_type="AUTH",
            entity_id=officer.id,
            ip_address=ip_address,
            details={"district": officer.district, "role": officer.role.value}
        )

        # Generate JWT Token
        dept_name = "Gujarat Police"
        try:
            if officer.department and hasattr(officer.department, "name"):
                dept_name = officer.department.name
        except Exception:
            pass

        from app.core.permissions import get_permissions_for_role
        from app.schemas.auth import UserContext

        role_str = officer.role.value if hasattr(officer.role, "value") else str(officer.role)
        custom_perms = getattr(officer, "custom_permissions", None) or []
        permissions = get_permissions_for_role(role_str, custom_perms)
        jurisdiction = getattr(officer, "jurisdiction", "Ahmedabad West Police Zone 1") or "Ahmedabad West Police Zone 1"

        token = create_access_token(
            subject=officer.id,
            role=role_str,
            badge_number=officer.badge_number,
            district=officer.district,
            department=dept_name,
        )

        user_context = UserContext(
            identity=officer.id,
            officer_id=officer.officer_id,
            badge_number=officer.badge_number,
            full_name=officer.full_name,
            role=role_str,
            rank=officer.rank,
            department=dept_name,
            jurisdiction=jurisdiction,
            district=officer.district,
            station=officer.station,
            permissions=permissions,
        )

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            officer_id=officer.officer_id,
            badge_number=officer.badge_number,
            role=role_str,
            district=officer.district,
            department=dept_name,
            jurisdiction=jurisdiction,
            permissions=permissions,
            user=user_context,
        )

    async def initiate_break_glass(
        self,
        db: AsyncSession,
        officer: Officer,
        request_data: BreakGlassRequest,
        ip_address: str = "127.0.0.1"
    ) -> BreakGlassResponse:
        """
        Activates the emergency Break-Glass protocol.
        Elevates permissions, logs mandatory operational justification, and emits a high-priority audit event.
        """
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=settings.BREAK_GLASS_AUTO_EXPIRE_MINUTES)
        session_id = f"BG-{uuid.uuid4().hex[:10].upper()}"

        session = BreakGlassSession(
            id=session_id,
            officer_id=officer.id,
            reason=request_data.reason,
            fir_number=request_data.fir_number,
            scope_district=request_data.scope_district,
            is_active=True,
            started_at=now,
            expires_at=expires_at,
        )
        db.add(session)
        await db.commit()

        # Compute Section 65B HMAC
        hmac_sig = generate_section65b_hmac(
            incident_id=session_id,
            camera_id=request_data.scope_district,
            timestamp=now.isoformat(),
            detected_plate="BREAK_GLASS_OVERRIDE",
            officer_id=officer.officer_id,
            metadata={"reason": request_data.reason, "fir": request_data.fir_number}
        )

        # Audit log the emergency escalation
        await audit_service.log_action(
            db=db,
            officer=officer,
            action="BREAK_GLASS_ACTIVATED",
            entity_type="SECURITY_PROTOCOL",
            entity_id=session_id,
            ip_address=ip_address,
            details={
                "reason": request_data.reason,
                "fir": request_data.fir_number,
                "scope": request_data.scope_district,
                "signature": hmac_sig
            }
        )

        return BreakGlassResponse(
            session_id=session_id,
            officer_id=officer.officer_id,
            is_active=True,
            started_at=now,
            expires_at=expires_at,
            message="🚨 BREAK-GLASS PROTOCOL ACTIVE. All cameras in target scope unlocked. High-priority audit trail started.",
            audit_signature=hmac_sig,
        )

    async def _create_default_officer(self, db: AsyncSession, officer_id: str, password: str) -> Officer:
        """Helper to create seed officer during development/demo."""
        role = OfficerRole.ADMIN if "ADMIN" in officer_id else OfficerRole.DUTY_OFFICER
        officer = Officer(
            id=str(uuid.uuid4()),
            officer_id=officer_id,
            badge_number=f"GJ-POL-{uuid.uuid4().hex[:4].upper()}",
            full_name=f"Officer {officer_id}",
            rank="Inspector" if role == OfficerRole.ADMIN else "Sub-Inspector",
            district="Ahmedabad City",
            station="Navrangpura Police Station",
            hashed_password=get_password_hash(password),
            role=role,
            is_active=True,
            is_on_duty=True,
        )
        db.add(officer)
        await db.commit()
        await db.refresh(officer)
        return officer


auth_service = AuthService()

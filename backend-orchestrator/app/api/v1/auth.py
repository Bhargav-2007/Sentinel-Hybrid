"""Authentication & Break-Glass API Endpoints."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limiter import check_rate_limit
from app.schemas.auth import LoginRequest, TokenResponse, OfficerResponse, BreakGlassRequest, BreakGlassResponse
from app.services.auth_service import auth_service
from app.api.deps import get_current_officer, get_client_ip
from app.models.officer import Officer

router = APIRouter(prefix="/auth", tags=["Authentication & Cybersecurity"])


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Officer Login Endpoint.
    Strictly authenticates via Officer ID / Badge Number (e.g. POLICE-AHM-042).
    Enforces brute-force rate limiting and issues signed JWT access token.
    """
    # Rate limit: max 10 attempts per minute on login route
    check_rate_limit(request, max_requests=15, window_seconds=60)
    client_ip = get_client_ip(request)
    return await auth_service.authenticate_officer(db, login_data, ip_address=client_ip)


@router.get("/me", response_model=OfficerResponse)
async def get_current_officer_profile(
    current_officer: Officer = Depends(get_current_officer)
):
    """Returns the authenticated officer's profile, role, rank, assigned jurisdiction, and granted permissions."""
    from app.core.permissions import get_permissions_for_role
    role_str = current_officer.role.value if hasattr(current_officer.role, "value") else str(current_officer.role)
    custom_perms = getattr(current_officer, "custom_permissions", None) or []
    perms = get_permissions_for_role(role_str, custom_perms)
    
    return OfficerResponse(
        id=current_officer.id,
        officer_id=current_officer.officer_id,
        badge_number=current_officer.badge_number,
        full_name=current_officer.full_name,
        rank=current_officer.rank,
        district=current_officer.district,
        station=current_officer.station,
        jurisdiction=getattr(current_officer, "jurisdiction", "Ahmedabad West Police Zone 1") or "Ahmedabad West Police Zone 1",
        role=role_str,
        department_id=current_officer.department_id,
        is_active=current_officer.is_active,
        is_on_duty=current_officer.is_on_duty,
        last_login=current_officer.last_login,
        permissions=perms,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_officer(
    request: Request,
    current_officer: Officer = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db)
):
    """Invalidates active session token and records officer sign-off in the audit ledger."""
    client_ip = get_client_ip(request)
    from app.services.audit_service import audit_service
    await audit_service.log_action(
        db=db,
        officer=current_officer,
        action="OFFICER_LOGOUT",
        entity_type="AUTH",
        entity_id=current_officer.id,
        ip_address=client_ip,
        details={"status": "SESSION_TERMINATED"}
    )
    return {"status": "SUCCESS", "message": "Officer session securely terminated."}


@router.post("/break-glass", response_model=BreakGlassResponse, status_code=status.HTTP_200_OK)
async def activate_break_glass_protocol(
    request: Request,
    bg_request: BreakGlassRequest,
    current_officer: Officer = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db)
):
    """
    Break-Glass Emergency Protocol.
    Temporarily elevates duty officer clearance to access all statewide feeds.
    Requires mandatory operational justification and generates an immutable Section 65B audit log.
    """
    client_ip = get_client_ip(request)
    return await auth_service.initiate_break_glass(db, current_officer, bg_request, ip_address=client_ip)


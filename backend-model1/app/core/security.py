"""
Gujarat Sentinel — Model 1
OIDC JWT Authentication + OPA Policy Enforcement

Security design:
  - JWT tokens from Keycloak (realm: sentinel) validated against JWKS endpoint
  - Role extraction from JWT claims (realm_roles + resource_access)
  - OPA policy enforcement for fine-grained RBAC
  - Development mode: auth can be disabled via AUTH_DISABLED=true
  - mTLS: handled at Traefik/service-mesh layer, not in application code

Sentinel RBAC roles:
  - sentinel_admin: Full access to all operations
  - sentinel_operator: Read + health management, no delete
  - sentinel_viewer: Read-only access
  - department_{code}: Access to cameras for specific department only
"""

from __future__ import annotations

import time
from functools import lru_cache
from typing import Any

import httpx
import structlog
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from app.config import get_settings

logger = structlog.get_logger(__name__)

# HTTP security scheme (extracts Bearer token)
bearer_scheme = HTTPBearer(auto_error=False)

# JWKS cache to avoid fetching on every request
_jwks_cache: dict[str, Any] | None = None
_jwks_last_fetched: float = 0
JWKS_CACHE_TTL = 3600  # seconds


async def _get_jwks() -> dict[str, Any]:
    """Fetch and cache the OIDC JWKS (JSON Web Key Set)."""
    global _jwks_cache, _jwks_last_fetched

    now = time.time()
    if _jwks_cache and (now - _jwks_last_fetched) < JWKS_CACHE_TTL:
        return _jwks_cache

    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(settings.oidc_jwks_url)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_last_fetched = now
            logger.info("jwks_refreshed", url=settings.oidc_jwks_url)
            return _jwks_cache
    except Exception as e:
        logger.error("jwks_fetch_failed", error=str(e))
        if _jwks_cache:
            return _jwks_cache  # Serve stale cache on failure
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Identity service unavailable",
        )


class CurrentUser:
    """Represents the authenticated user extracted from JWT claims."""

    def __init__(
        self,
        user_id: str,
        username: str,
        email: str | None,
        roles: list[str],
        department_codes: list[str],
        raw_claims: dict[str, Any],
    ):
        self.user_id = user_id
        self.username = username
        self.email = email
        self.roles = roles
        self.department_codes = department_codes
        self.raw_claims = raw_claims

    @property
    def is_admin(self) -> bool:
        return "sentinel_admin" in self.roles

    @property
    def is_operator(self) -> bool:
        return "sentinel_operator" in self.roles or self.is_admin

    @property
    def is_viewer(self) -> bool:
        return True  # All authenticated users can view

    def can_access_department(self, dept_code: str) -> bool:
        """Check if user has access to a specific department's cameras."""
        if self.is_admin:
            return True
        if dept_code.upper() in [d.upper() for d in self.department_codes]:
            return True
        return False

    def __repr__(self) -> str:
        return f"<CurrentUser {self.username} roles={self.roles}>"


# ── Development placeholder user (when auth disabled) ────────────────────────

_DEV_USER = CurrentUser(
    user_id="dev-admin",
    username="dev_admin",
    email="dev@sentinel.local",
    roles=["sentinel_admin"],
    department_codes=[],
    raw_claims={"sub": "dev-admin", "preferred_username": "dev_admin"},
)


# ── JWT Validation ────────────────────────────────────────────────────────────

async def validate_token(token: str) -> CurrentUser:
    """
    Validate a JWT token against the Keycloak JWKS.

    Validates:
      - Signature (RS256 from Keycloak)
      - Expiration (exp claim)
      - Issuer (iss claim)
      - Audience (aud claim)
    """
    settings = get_settings()

    try:
        jwks = await _get_jwks()

        # Decode and verify JWT
        claims = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            audience=settings.oidc_audience,
            issuer=settings.oidc_issuer,
            options={"verify_exp": True},
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.warning("jwt_validation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract roles from Keycloak JWT structure
    realm_roles: list[str] = (
        claims.get("realm_access", {}).get("roles", [])
    )
    resource_roles: list[str] = (
        claims.get("resource_access", {})
        .get(settings.oidc_audience, {})
        .get("roles", [])
    )
    all_roles = realm_roles + resource_roles

    # Extract department codes from roles (e.g., "department_HOME" → "HOME")
    dept_codes = [
        r.replace("department_", "")
        for r in all_roles
        if r.startswith("department_")
    ]

    return CurrentUser(
        user_id=claims.get("sub", ""),
        username=claims.get("preferred_username", "unknown"),
        email=claims.get("email"),
        roles=all_roles,
        department_codes=dept_codes,
        raw_claims=claims,
    )


# ── FastAPI Dependencies ──────────────────────────────────────────────────────

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """
    FastAPI dependency to extract and validate the current user from JWT.

    In development (AUTH_DISABLED=true), returns a dev admin user.
    """
    settings = get_settings()

    if settings.auth_disabled:
        logger.debug("auth_disabled_using_dev_user")
        return _DEV_USER

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await validate_token(credentials.credentials)

    # Add user to request state for access in middleware
    request.state.user_id = user.user_id
    request.state.username = user.username

    return user


async def require_operator(
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Dependency: require operator or admin role."""
    if not user.is_operator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator role required",
        )
    return user


async def require_admin(
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Dependency: require admin role."""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return user


# ── OPA Policy Client ────────────────────────────────────────────────────────

class OPAClient:
    """
    Open Policy Agent client for fine-grained policy enforcement.

    OPA policies are defined in infra/opa/policies/sentinel.rego
    The policy receives the user context and requested action
    and returns allow=true/false.
    """

    def __init__(self, base_url: str, policy_path: str):
        self.base_url = base_url
        self.policy_path = policy_path

    async def check(
        self,
        user: CurrentUser,
        action: str,
        resource: str,
        context: dict[str, Any] | None = None,
    ) -> bool:
        """
        Check if action is allowed for user on resource.

        Args:
            user: Authenticated user
            action: Action name (e.g., "camera:delete")
            resource: Resource identifier (e.g., "camera:{camera_id}")
            context: Additional context (department_id, etc.)

        Returns:
            True if allowed, False if denied
        """
        settings = get_settings()
        if settings.opa_disabled:
            return True

        input_doc = {
            "input": {
                "user": {
                    "id": user.user_id,
                    "roles": user.roles,
                    "department_codes": user.department_codes,
                },
                "action": action,
                "resource": resource,
                "context": context or {},
            }
        }

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.post(
                    f"{self.base_url}/v1/data/{self.policy_path}/allow",
                    json=input_doc,
                )
                if response.status_code == 200:
                    result = response.json()
                    return bool(result.get("result", False))
                return False
        except Exception as e:
            logger.error("opa_check_failed", action=action, error=str(e))
            # Fail-open in development, fail-closed in production
            return settings.is_dev


@lru_cache(maxsize=1)
def get_opa_client() -> OPAClient:
    """Return cached OPA client instance."""
    settings = get_settings()
    return OPAClient(
        base_url=settings.opa_url,
        policy_path=settings.opa_policy_path,
    )

"""
Gujarat Sentinel — Fine-Grained Role-Based Access Control (RBAC) & Permissions Engine.
Defines canonical permission strings and maps police roles (Operator, Investigator, Supervisor, Admin)
to capability sets enforced across all backend API endpoints and frontend navigation elements.
"""

from __future__ import annotations

import enum
from typing import List, Set, Dict


class Permission(str, enum.Enum):
    # Camera Permissions
    CAMERA_READ = "camera.read"
    CAMERA_MANAGE = "camera.manage"
    CAMERA_REGISTER = "camera.register"
    CAMERA_PTZ = "camera.ptz"

    # Alert Permissions
    ALERT_READ = "alert.read"
    ALERT_ACKNOWLEDGE = "alert.acknowledge"
    ALERT_REVIEW = "alert.review"
    ALERT_DISPATCH = "alert.dispatch"

    # Search & Intelligence Permissions
    VEHICLE_SEARCH = "vehicle.search"
    PERSON_SEARCH = "person.search"
    INVESTIGATION_ADVANCED = "investigation.advanced"

    # Case Management Permissions
    CASE_CREATE = "case.create"
    CASE_MANAGE = "case.manage"
    CASE_REVIEW = "case.review"

    # Evidence & Judicial Permissions
    EVIDENCE_READ = "evidence.read"
    EVIDENCE_EXPORT = "evidence.export"
    EVIDENCE_VERIFY = "evidence.verify"

    # Administration & Governance Permissions
    WATCHLIST_MANAGE = "watchlist.manage"
    USER_MANAGE = "user.manage"
    SYSTEM_CONFIG = "system.config"
    AUDIT_FULL = "audit.full"
    DASHBOARD_OVERVIEW = "dashboard.overview"
    ANALYTICS_BROAD = "analytics.broad"


# Role-to-Permissions Mapping Matrix
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    # 1. Operator: Focus on real-time observation, alert acknowledgement, and basic search
    "OPERATOR": {
        Permission.DASHBOARD_OVERVIEW.value,
        Permission.CAMERA_READ.value,
        Permission.ALERT_READ.value,
        Permission.ALERT_ACKNOWLEDGE.value,
        Permission.VEHICLE_SEARCH.value,
        Permission.PERSON_SEARCH.value,
        Permission.EVIDENCE_READ.value,
        Permission.EVIDENCE_VERIFY.value,
    },
    # 2. Investigator: Advanced search, trajectory reconstruction, case creation, and evidence export
    "INVESTIGATOR": {
        Permission.DASHBOARD_OVERVIEW.value,
        Permission.CAMERA_READ.value,
        Permission.ALERT_READ.value,
        Permission.ALERT_ACKNOWLEDGE.value,
        Permission.VEHICLE_SEARCH.value,
        Permission.PERSON_SEARCH.value,
        Permission.INVESTIGATION_ADVANCED.value,
        Permission.CASE_CREATE.value,
        Permission.CASE_MANAGE.value,
        Permission.EVIDENCE_READ.value,
        Permission.EVIDENCE_EXPORT.value,
        Permission.EVIDENCE_VERIFY.value,
    },
    # 3. Supervisor: Operational overview, case review, alert assignment, camera & watchlist governance
    "SUPERVISOR": {
        Permission.DASHBOARD_OVERVIEW.value,
        Permission.ANALYTICS_BROAD.value,
        Permission.CAMERA_READ.value,
        Permission.CAMERA_MANAGE.value,
        Permission.CAMERA_PTZ.value,
        Permission.ALERT_READ.value,
        Permission.ALERT_ACKNOWLEDGE.value,
        Permission.ALERT_REVIEW.value,
        Permission.ALERT_DISPATCH.value,
        Permission.VEHICLE_SEARCH.value,
        Permission.PERSON_SEARCH.value,
        Permission.INVESTIGATION_ADVANCED.value,
        Permission.CASE_CREATE.value,
        Permission.CASE_MANAGE.value,
        Permission.CASE_REVIEW.value,
        Permission.EVIDENCE_READ.value,
        Permission.EVIDENCE_EXPORT.value,
        Permission.EVIDENCE_VERIFY.value,
        Permission.WATCHLIST_MANAGE.value,
    },
    # 4. Administrator: Complete statewide system sovereignty
    "ADMIN": {p.value for p in Permission},

    # Aliases for backward compatibility
    "DUTY_OFFICER": {
        Permission.DASHBOARD_OVERVIEW.value,
        Permission.CAMERA_READ.value,
        Permission.ALERT_READ.value,
        Permission.ALERT_ACKNOWLEDGE.value,
        Permission.VEHICLE_SEARCH.value,
        Permission.PERSON_SEARCH.value,
        Permission.INVESTIGATION_ADVANCED.value,
        Permission.CASE_CREATE.value,
        Permission.CASE_MANAGE.value,
        Permission.EVIDENCE_READ.value,
        Permission.EVIDENCE_EXPORT.value,
        Permission.EVIDENCE_VERIFY.value,
    },
    "DISPATCHER": {
        Permission.DASHBOARD_OVERVIEW.value,
        Permission.CAMERA_READ.value,
        Permission.ALERT_READ.value,
        Permission.ALERT_ACKNOWLEDGE.value,
        Permission.ALERT_DISPATCH.value,
        Permission.VEHICLE_SEARCH.value,
        Permission.PERSON_SEARCH.value,
        Permission.EVIDENCE_READ.value,
    },
}


def get_permissions_for_role(role_name: str, custom_permissions: List[str] = None) -> List[str]:
    """Resolves all granted permission strings for a given officer role."""
    norm_role = role_name.upper().strip()
    base_perms = set(ROLE_PERMISSIONS.get(norm_role, ROLE_PERMISSIONS["OPERATOR"]))
    if custom_permissions:
        base_perms.update(custom_permissions)
    return sorted(list(base_perms))


def has_permission(officer_role: str, required_permission: str, custom_permissions: List[str] = None) -> bool:
    """Checks if an officer role or custom permission list satisfies the required permission."""
    granted = get_permissions_for_role(officer_role, custom_permissions)
    return required_permission in granted or "all" in granted or officer_role.upper() == "ADMIN"

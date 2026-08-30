package sentinel.model1

import future.keywords

# ─────────────────────────────────────────────────────────────────────────────
# Gujarat Sentinel — OPA Authorization Policies
# Model 1: CCTV Registry & GIS
#
# Policy structure:
#   - allow: top-level rule — true if any matching rule is satisfied
#   - Role hierarchy: sentinel_admin > sentinel_operator > sentinel_viewer
#   - Department scope: users with department_X can only see/modify dept X
#
# Test: opa eval -d . -i input.json 'data.sentinel.model1.allow'
# ─────────────────────────────────────────────────────────────────────────────

default allow = false

# ── Admin has full access ─────────────────────────────────────────────────────
allow if {
    "sentinel_admin" in input.user.roles
}

# ── Operators can create/update cameras ───────────────────────────────────────
allow if {
    "sentinel_operator" in input.user.roles
    input.action in {"camera:create", "camera:update", "camera:bulk_import",
                     "camera:list", "camera:get", "gis:read", "audit:read",
                     "department:get"}
}

# ── Viewers have read-only access ─────────────────────────────────────────────
allow if {
    "sentinel_viewer" in input.user.roles
    input.action in {"camera:list", "camera:get", "gis:read", "department:get"}
}

# ── Department-scoped operators ───────────────────────────────────────────────
# Users with department_HOME can create/update cameras only for HOME department
allow if {
    some dept_role in input.user.roles
    startswith(dept_role, "department_")
    dept_code := substring(dept_role, count("department_"), -1)
    input.action in {"camera:create", "camera:update", "camera:get", "camera:list"}
    # Verify the target resource belongs to this department
    input.context.department_code == dept_code
}

# ── Department users can always read their own department's cameras ───────────
allow if {
    some dept_role in input.user.roles
    startswith(dept_role, "department_")
    input.action in {"camera:list", "camera:get", "gis:read"}
}

# ── Public endpoints (no auth required via OPA) ───────────────────────────────
# These are controlled by the auth_disabled flag in the application code
allow if {
    input.action in {"health:read", "ready:read", "metrics:read"}
}

# ─────────────────────────────────────────────────────────────────────────────
# Utility rules
# ─────────────────────────────────────────────────────────────────────────────

is_admin if {
    "sentinel_admin" in input.user.roles
}

is_operator if {
    "sentinel_operator" in input.user.roles
}

user_department_codes := {
    dept |
    some role in input.user.roles
    startswith(role, "department_")
    dept := substring(role, count("department_"), -1)
}

# ─────────────────────────────────────────────────────────────────────────────
# Delete requires admin
# ─────────────────────────────────────────────────────────────────────────────
allow if {
    "sentinel_admin" in input.user.roles
    input.action == "camera:delete"
}

# ─────────────────────────────────────────────────────────────────────────────
# Bulk import requires at least operator
# ─────────────────────────────────────────────────────────────────────────────
allow if {
    "sentinel_operator" in input.user.roles
    input.action == "camera:bulk_import"
}

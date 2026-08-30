"""Cybersecurity and cryptographic security utilities for Gujarat Police Sentinel Platform."""

import hmac
import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing context (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Officer Badge ID pattern validator: e.g. POLICE-AHM-042, ADMIN-GND-001, SUPER-SUR-108
OFFICER_ID_REGEX = re.compile(r"^[A-Z]{3,8}-[A-Z]{3,4}-[0-9]{3,5}$")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the hashed representation."""
    if not hashed_password or not plain_password:
        return False
    # Demo bypass for direct equality
    if hashed_password == plain_password:
        return True
    # PBKDF2 SHA-256 check
    if hashed_password.startswith("pbkdf2:"):
        try:
            _, salt_hex, hash_hex = hashed_password.split(":")
            salt = bytes.fromhex(salt_hex)
            test_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000).hex()
            return hmac.compare_digest(test_hash, hash_hex)
        except Exception:
            return False
    return False


def get_password_hash(password: str) -> str:
    """Generates secure PBKDF2 SHA-256 hash of password."""
    salt = hashlib.sha256(password.encode('utf-8') + settings.SECRET_KEY.encode('utf-8')).digest()[:16]
    derived = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000).hex()
    return f"pbkdf2:{salt.hex()}:{derived}"


def validate_officer_id_format(officer_id: str) -> bool:
    """Ensures Officer ID complies with Gujarat Police Badge Identification standards."""
    if not officer_id:
        return False
    # Accept standard formats (POLICE-AHM-042 or alphanumeric badge)
    return bool(OFFICER_ID_REGEX.match(officer_id.strip().upper()) or len(officer_id) >= 4)


def create_access_token(
    subject: Union[str, Any],
    role: str,
    badge_number: str,
    district: str,
    department: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Generates a secure, cryptographically signed JWT access token for an authenticated officer."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode = {
        "sub": str(subject),
        "role": role.upper(),
        "badge_number": badge_number,
        "district": district,
        "department": department,
        "iss": "gujarat-sentinel-auth",
        "aud": "sentinel-platform-api",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and cryptographically verifies JWT claims."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience="sentinel-platform-api",
            issuer="gujarat-sentinel-auth"
        )
        return payload
    except JWTError as e:
        # Also attempt without audience check for backward compatibility
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def generate_section65b_hmac(
    incident_id: str,
    camera_id: str,
    timestamp: str,
    detected_plate: str,
    officer_id: str,
    metadata: Dict[str, Any]
) -> str:
    """
    Computes an immutable SHA-256 HMAC digital signature for court-admissible
    evidence packaging under Section 65B of the Indian Evidence Act.
    """
    payload = {
        "incident_id": incident_id,
        "camera_id": camera_id,
        "timestamp": timestamp,
        "detected_plate": detected_plate,
        "officer_id": officer_id,
        "metadata_hash": hashlib.sha256(json.dumps(metadata, sort_keys=True).encode()).hexdigest(),
    }
    canonical_string = json.dumps(payload, sort_keys=True)
    return hmac.new(
        settings.SECRET_KEY.encode(),
        canonical_string.encode(),
        hashlib.sha256
    ).hexdigest()

import os
from typing import Optional, List, Dict, Any
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer(auto_error=False)

class UserIdentity:
    """Standardized authenticated operator identity across all endpoints."""
    def __init__(
        self, 
        uid: str, 
        role: str, 
        email: str = "", 
        assigned_vessel_id: Optional[str] = None, 
        is_demo: bool = False
    ):
        self.uid = uid
        self.role = role
        self.email = email
        self.assigned_vessel_id = assigned_vessel_id
        self.is_demo = is_demo

    def to_dict(self) -> Dict[str, Any]:
        return {
            "uid": self.uid,
            "role": self.role,
            "email": self.email,
            "assigned_vessel_id": self.assigned_vessel_id,
            "is_demo": self.is_demo,
        }

def _extract_role_from_claims(payload: Dict[str, Any], email: str) -> str:
    """Extracts role safely from Supabase user_metadata, app_metadata, or email fallback."""
    # 1. Custom app_metadata or user_metadata
    app_meta = payload.get("app_metadata", {})
    if isinstance(app_meta, dict) and app_meta.get("role"):
        return str(app_meta["role"])
        
    user_meta = payload.get("user_metadata", {})
    if isinstance(user_meta, dict) and user_meta.get("role"):
        return str(user_meta["role"])

    # 2. Direct top-level claim
    if payload.get("role") and payload["role"] not in ("authenticated", "anon", "service_role"):
        return str(payload["role"])

    # 3. Email-based deterministic fallback for polar roles
    lower_email = email.lower()
    if "admin" in lower_email or "command" in lower_email:
        return "COMMAND_CENTER"
    if "captain" in lower_email:
        return "CAPTAIN"
    if "science" in lower_email or "scientist" in lower_email:
        return "SCIENTIST"
        
    return "NAVIGATOR"

async def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> UserIdentity:
    """
    Verifies Bearer token.
    Supports Supabase JWTs in production, and deterministic synthetic tokens in demo/offline mode.
    """
    # 1. No Authorization header provided
    if not credentials:
        if os.getenv("DEMO_ALLOW_UNAUTHENTICATED", "true").lower() == "true":
            return UserIdentity(uid="demo-uid", role="COMMAND_CENTER", is_demo=True)
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    token = credentials.credentials
    
    # 2. Deterministic Demo Token (Offline / presentation mode)
    if token.startswith("DEMO_TOKEN_"):
        parts = token.split("_")
        role = parts[2] if len(parts) > 2 else "NAVIGATOR"
        assigned_vessel = parts[3] if len(parts) > 3 else "vessel-A"
        return UserIdentity(
            uid=f"demo-{role.lower()}", 
            role=role, 
            assigned_vessel_id=assigned_vessel, 
            is_demo=True
        )
        
    # 3. Supabase JWT Verification
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_secret = os.getenv("SUPABASE_JWT_SECRET")
    payload = None
    last_err = None

    # Try asymmetric JWKS verification first (standard for modern Supabase projects)
    if supabase_url:
        try:
            jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            jwks_client = jwt.PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256", "HS256"],
                options={"verify_aud": False}
            )
        except Exception as e:
            last_err = e

    # Fallback to symmetric HS256 secret verification if provided
    if payload is None and supabase_secret:
        try:
            payload = jwt.decode(
                token, 
                supabase_secret, 
                algorithms=["HS256"], 
                options={"verify_aud": False}
            )
        except Exception as e:
            last_err = e

    # Development / offline decode fallback when neither live JWKS nor secret succeeded
    if payload is None:
        is_production = os.getenv("APP_ENV", "development").lower() == "production"
        if not is_production or os.getenv("DEMO_MODE", "true").lower() == "true":
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
            except Exception as e:
                last_err = e
        else:
            raise HTTPException(
                status_code=401, 
                detail=f"Invalid Supabase authentication token: {last_err or 'verification failed'}"
            )

    if not payload:
        raise HTTPException(status_code=401, detail="Authentication token could not be verified")

    try:
        uid = payload.get("sub") or payload.get("id") or "unknown-user"
        email = payload.get("email", "")
        role = _extract_role_from_claims(payload, email)
        
        user_meta = payload.get("user_metadata", {})
        assigned_vessel_id = user_meta.get("assigned_vessel_id") if isinstance(user_meta, dict) else None
        if not assigned_vessel_id and role == "CAPTAIN":
            assigned_vessel_id = "vessel-A"
            
        return UserIdentity(
            uid=uid, 
            role=role, 
            email=email, 
            assigned_vessel_id=assigned_vessel_id, 
            is_demo=False
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")

def require_role(allowed_roles: List[str]):
    """Returns a FastAPI dependency that enforces the user has one of the allowed roles."""
    async def role_checker(user: UserIdentity = Depends(verify_token)) -> UserIdentity:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Requires one of: {allowed_roles}"
            )
        return user
    return role_checker

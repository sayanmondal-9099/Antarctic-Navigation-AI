import os
import asyncio
import jwt
import pytest
from fastapi import HTTPException
from app.core.supabase.auth import verify_token, require_role, UserIdentity
from fastapi.security import HTTPAuthorizationCredentials

def test_verify_demo_token():
    try:
        os.environ["DEMO_ALLOW_UNAUTHENTICATED"] = "false"
        
        # 1. Valid Demo Token
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="DEMO_TOKEN_CAPTAIN_vessel-A")
        user = asyncio.run(verify_token(creds))
        assert user.is_demo is True
        assert user.role == "CAPTAIN"
        assert user.assigned_vessel_id == "vessel-A"
        
        # 2. Missing creds with DEMO_ALLOW_UNAUTHENTICATED=true
        os.environ["DEMO_ALLOW_UNAUTHENTICATED"] = "true"
        user_unauth = asyncio.run(verify_token(None))
        assert user_unauth.is_demo is True
        assert user_unauth.role == "COMMAND_CENTER"
    finally:
        os.environ["DEMO_ALLOW_UNAUTHENTICATED"] = "true"

def test_verify_supabase_jwt():
    secret = "test-secret-key-12345-secure-32bytes-long!"
    os.environ["SUPABASE_JWT_SECRET"] = secret
    os.environ["DEMO_ALLOW_UNAUTHENTICATED"] = "false"
    
    try:
        # Generate test Supabase JWT
        payload = {
            "sub": "user-uuid-987",
            "email": "navigator@antarctic.org",
            "user_metadata": {
                "role": "NAVIGATOR",
                "assigned_vessel_id": "vessel-A"
            }
        }
        token = jwt.encode(payload, secret, algorithm="HS256")
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        
        user = asyncio.run(verify_token(creds))
        assert user.is_demo is False
        assert user.uid == "user-uuid-987"
        assert user.role == "NAVIGATOR"
        assert user.email == "navigator@antarctic.org"
    finally:
        os.environ["DEMO_ALLOW_UNAUTHENTICATED"] = "true"
        os.environ.pop("SUPABASE_JWT_SECRET", None)
    assert user.email == "navigator@antarctic.org"

def test_require_role():
    user = UserIdentity(uid="123", role="CAPTAIN")
    
    # Should pass
    checker = require_role(["COMMAND_CENTER", "CAPTAIN"])
    result = asyncio.run(checker(user))
    assert result.uid == "123"
    
    # Should fail with 403
    checker_fail = require_role(["COMMAND_CENTER"])
    with pytest.raises(HTTPException) as exc:
        asyncio.run(checker_fail(user))
    assert exc.value.status_code == 403

def test_unauthenticated_rejected_when_flag_disabled():
    os.environ["DEMO_ALLOW_UNAUTHENTICATED"] = "false"
    try:
        with pytest.raises(HTTPException) as exc:
            asyncio.run(verify_token(None))
        assert exc.value.status_code == 401
    finally:
        os.environ["DEMO_ALLOW_UNAUTHENTICATED"] = "true"

def test_invalid_jwt_rejected_in_production():
    os.environ["APP_ENV"] = "production"
    os.environ["DEMO_MODE"] = "false"
    os.environ["DEMO_ALLOW_UNAUTHENTICATED"] = "false"
    try:
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.garbage.jwt")
        with pytest.raises(HTTPException) as exc:
            asyncio.run(verify_token(creds))
        assert exc.value.status_code == 401
    finally:
        os.environ["APP_ENV"] = "development"
        os.environ["DEMO_MODE"] = "true"
        os.environ["DEMO_ALLOW_UNAUTHENTICATED"] = "true"

import os
from app.core.supabase.client import DatabaseWrapper, get_supabase_config

def test_supabase_fallback():
    # Force offline mode
    os.environ["SUPABASE_OFFLINE_MODE"] = "true"
    
    cfg = get_supabase_config()
    assert cfg is None
    assert DatabaseWrapper.is_available() is False
    
    # Graceful return None / False without raising exceptions
    record = DatabaseWrapper.get_record("vessels", "vessel-A")
    assert record is None
    
    saved = DatabaseWrapper.upsert_record("vessels", {"id": "vessel-A", "name": "Ship A"})
    assert saved is False
    
    query_res = DatabaseWrapper.query_table("vessels")
    assert query_res is None

import os
from typing import Optional, Any, Dict, List
import httpx

def get_supabase_config() -> Optional[Dict[str, str]]:
    """Returns Supabase URL and key if configured, otherwise None."""
    if os.getenv("SUPABASE_OFFLINE_MODE", "false").lower() == "true":
        return None
        
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        return None
        
    return {
        "url": url.rstrip("/"),
        "key": key
    }

def get_supabase_client() -> Optional[Dict[str, str]]:
    """Returns Supabase config/client connection if available, otherwise None."""
    return get_supabase_config()

class DatabaseWrapper:
    """
    Clean persistence adapter for Supabase PostgreSQL with 100% deterministic offline fallback.
    """
    
    @staticmethod
    def is_available() -> bool:
        return get_supabase_config() is not None

    @staticmethod
    def get_record(table: str, record_id: str) -> Optional[Dict[str, Any]]:
        cfg = get_supabase_config()
        if not cfg:
            return None
            
        endpoint = f"{cfg['url']}/rest/v1/{table}?id=eq.{record_id}&select=*"
        headers = {
            "apikey": cfg["key"],
            "Authorization": f"Bearer {cfg['key']}",
            "Accept": "application/json"
        }
        
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.get(endpoint, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data[0] if data else None
        except Exception as e:
            print(f"[Supabase] Error reading {table}/{record_id}: {e}")
        return None

    @staticmethod
    def upsert_record(table: str, data: Dict[str, Any]) -> bool:
        cfg = get_supabase_config()
        if not cfg:
            return False
            
        endpoint = f"{cfg['url']}/rest/v1/{table}"
        headers = {
            "apikey": cfg["key"],
            "Authorization": f"Bearer {cfg['key']}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.post(endpoint, json=data, headers=headers)
                return resp.status_code in (200, 201)
        except Exception as e:
            print(f"[Supabase] Error upserting to {table}: {e}")
        return False

    @staticmethod
    def query_table(table: str, limit: int = 100, filters: Optional[Dict[str, str]] = None) -> Optional[List[Dict[str, Any]]]:
        cfg = get_supabase_config()
        if not cfg:
            return None
            
        query_params = f"select=*&limit={limit}"
        if filters:
            for k, v in filters.items():
                query_params += f"&{k}=eq.{v}"
                
        endpoint = f"{cfg['url']}/rest/v1/{table}?{query_params}"
        headers = {
            "apikey": cfg["key"],
            "Authorization": f"Bearer {cfg['key']}",
            "Accept": "application/json"
        }
        
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.get(endpoint, headers=headers)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            print(f"[Supabase] Error querying {table}: {e}")
        return None

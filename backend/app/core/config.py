import os
from typing import List

class Settings:
    PROJECT_NAME: str = "Antarctic Maritime Navigation Decision-Support System"
    SERVICE_NAME: str = "antarctic-navigation-api"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api"
    
    # Environment variables with fallbacks
    COPERNICUS_USERNAME: str = os.getenv("COPERNICUS_USERNAME", "")
    CDS_API_KEY: str = os.getenv("CDS_API_KEY", "")
    AIS_API_KEY: str = os.getenv("AIS_API_KEY", "")
    
    # CORS Origins
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    APP_ENV: str = os.getenv("APP_ENV", "development")

    @property
    def cors_origins(self) -> List[str]:
        if self.APP_ENV == "development" or self.APP_ENV == "demo":
            return [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                self.FRONTEND_URL
            ]
        return [self.FRONTEND_URL]

settings = Settings()

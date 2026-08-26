from typing import List
from fastapi import APIRouter
from app.models.schemas import Vessel, Iceberg
from app.services.data_service import data_service

router = APIRouter()

@router.get("/vessels", response_model=List[Vessel])
def get_vessels() -> List[Vessel]:
    return [Vessel(**v) for v in data_service.get_vessels()]

@router.get("/icebergs", response_model=List[Iceberg])
def get_icebergs() -> List[Iceberg]:
    return [Iceberg(**i) for i in data_service.get_icebergs()]

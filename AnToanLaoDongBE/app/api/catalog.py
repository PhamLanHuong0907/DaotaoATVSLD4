"""Catalog CRUD: Occupation + CertificateType."""
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user, require_staff
from app.models.catalog import Occupation, CertificateType
from app.models.user import User

router = APIRouter(tags=["Catalog"])


# ---- Occupation ----

class OccupationCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    skill_levels: list[int] = []


class OccupationUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    skill_levels: Optional[list[int]] = None
    is_active: Optional[bool] = None


class OccupationResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str]
    skill_levels: list[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime


def _occ_to_response(o: Occupation) -> OccupationResponse:
    return OccupationResponse(id=str(o.id), **o.model_dump(exclude={"id"}))


@router.post("/occupations", response_model=OccupationResponse)
async def create_occupation(data: OccupationCreate, _: User = Depends(require_staff())):
    if await Occupation.find_one(Occupation.code == data.code):
        raise HTTPException(400, f"Mã nghề '{data.code}' đã tồn tại")
    o = Occupation(**data.model_dump())
    await o.insert()
    return _occ_to_response(o)


@router.get("/occupations", response_model=list[OccupationResponse])
async def list_occupations(only_active: bool = True, _: User = Depends(get_current_user)):
    q: dict = {"is_active": True} if only_active else {}
    items = await Occupation.find(q).sort("name").to_list()
    return [_occ_to_response(o) for o in items]


@router.get("/occupations/{occ_id}", response_model=OccupationResponse)
async def get_occupation(occ_id: str, _: User = Depends(get_current_user)):
    o = await Occupation.get(PydanticObjectId(occ_id))
    if not o:
        raise HTTPException(404, "Không tìm thấy nghề")
    return _occ_to_response(o)


@router.put("/occupations/{occ_id}", response_model=OccupationResponse)
async def update_occupation(occ_id: str, data: OccupationUpdate, _: User = Depends(require_staff())):
    o = await Occupation.get(PydanticObjectId(occ_id))
    if not o:
        raise HTTPException(404, "Không tìm thấy nghề")
    upd = data.model_dump(exclude_unset=True)
    upd["updated_at"] = datetime.now(timezone.utc)
    await o.set(upd)
    return _occ_to_response(o)


@router.delete("/occupations/{occ_id}")
async def delete_occupation(occ_id: str, _: User = Depends(require_staff())):
    o = await Occupation.get(PydanticObjectId(occ_id))
    if not o:
        raise HTTPException(404, "Không tìm thấy nghề")
    await o.delete()
    return {"success": True}


# ---- CertificateType ----

class CertTypeCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    validity_months: int = 12
    issuing_authority: Optional[str] = None


class CertTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    validity_months: Optional[int] = None
    issuing_authority: Optional[str] = None
    is_active: Optional[bool] = None


class CertTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str]
    validity_months: int
    issuing_authority: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


def _ct_to_response(c: CertificateType) -> CertTypeResponse:
    return CertTypeResponse(id=str(c.id), **c.model_dump(exclude={"id"}))


@router.post("/certificate-types", response_model=CertTypeResponse)
async def create_cert_type(data: CertTypeCreate, _: User = Depends(require_staff())):
    if await CertificateType.find_one(CertificateType.code == data.code):
        raise HTTPException(400, f"Mã chứng chỉ '{data.code}' đã tồn tại")
    c = CertificateType(**data.model_dump())
    await c.insert()
    return _ct_to_response(c)


@router.get("/certificate-types", response_model=list[CertTypeResponse])
async def list_cert_types(only_active: bool = True, _: User = Depends(get_current_user)):
    q: dict = {"is_active": True} if only_active else {}
    items = await CertificateType.find(q).sort("name").to_list()
    return [_ct_to_response(c) for c in items]


@router.get("/certificate-types/{ct_id}", response_model=CertTypeResponse)
async def get_cert_type(ct_id: str, _: User = Depends(get_current_user)):
    c = await CertificateType.get(PydanticObjectId(ct_id))
    if not c:
        raise HTTPException(404, "Không tìm thấy loại chứng chỉ")
    return _ct_to_response(c)


@router.put("/certificate-types/{ct_id}", response_model=CertTypeResponse)
async def update_cert_type(ct_id: str, data: CertTypeUpdate, _: User = Depends(require_staff())):
    c = await CertificateType.get(PydanticObjectId(ct_id))
    if not c:
        raise HTTPException(404, "Không tìm thấy loại chứng chỉ")
    upd = data.model_dump(exclude_unset=True)
    upd["updated_at"] = datetime.now(timezone.utc)
    await c.set(upd)
    return _ct_to_response(c)


@router.delete("/certificate-types/{ct_id}")
async def delete_cert_type(ct_id: str, _: User = Depends(require_staff())):
    c = await CertificateType.get(PydanticObjectId(ct_id))
    if not c:
        raise HTTPException(404, "Không tìm thấy loại chứng chỉ")
    await c.delete()
    return {"success": True}

"""QR router — generate entry/exit QR codes as PNG images."""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.qr_service import make_qr

router = APIRouter()


@router.get("/{structure_id}")
def entry_qr(structure_id: str):
    buf = make_qr({"structure_id": structure_id, "gate": 1, "type": "entry"})
    return StreamingResponse(buf, media_type="image/png")


@router.get("/{structure_id}/exit")
def exit_qr(structure_id: str):
    buf = make_qr({"structure_id": structure_id, "gate": 1, "type": "exit"})
    return StreamingResponse(buf, media_type="image/png")

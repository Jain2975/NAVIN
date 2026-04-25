"""QR code generation service."""
import io
import json
import qrcode


def make_qr(data: dict) -> io.BytesIO:
    """Generate a QR code PNG from a dict payload."""
    img = qrcode.make(json.dumps(data))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

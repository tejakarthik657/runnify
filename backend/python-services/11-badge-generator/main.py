# Service 11: Badge Generator
# Port: 8011
# Tech: Pillow (PIL)
# Purpose: Generate achievement badges, QR codes, profile banners

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import qrcode
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import formatter

app = FastAPI(title="Badge Generator", version="1.0.0")

class BadgeRequest(BaseModel):
    user_name: str
    achievement_type: str  # distance, hexes, streak, runs, faction
    achievement_value: str
    color_scheme: str = "green"  # green, blue, red, gold

class QRRequest(BaseModel):
    data: str
    size: int = 300
    border: int = 2


def create_achievement_badge(user_name: str, achievement_type: str, value: str, color_scheme: str) -> Image.Image:
    """Create achievement badge image"""
    # Image size
    width, height = 800, 800
    
    # Color schemes
    colors = {
        "green": {"primary": "#A8D5BA", "secondary": "#5F9EA0", "text": "#1a1a2e"},
        "blue": {"primary": "#42A5F5", "secondary": "#1976D2", "text": "#ffffff"},
        "red": {"primary": "#E57373", "secondary": "#D32F2F", "text": "#ffffff"},
        "gold": {"primary": "#FFD54F", "secondary": "#FFA000", "text": "#1a1a2e"}
    }
    
    scheme = colors.get(color_scheme, colors["green"])
    
    # Create image
    img = Image.new('RGB', (width, height), color=scheme['primary'])
    draw = ImageDraw.Draw(img)
    
    # Draw decorative circle
    circle_radius = 300
    circle_bbox = [
        (width - circle_radius) // 2,
        (height - circle_radius) // 2 - 50,
        (width + circle_radius) // 2,
        (height + circle_radius) // 2 - 50
    ]
    draw.ellipse(circle_bbox, outline=scheme['secondary'], width=8)
    
    # Draw inner circle
    inner_radius = 250
    inner_bbox = [
        (width - inner_radius) // 2,
        (height - inner_radius) // 2 - 50,
        (width + inner_radius) // 2,
        (height + inner_radius) // 2 - 50
    ]
    draw.ellipse(inner_bbox, fill=scheme['secondary'])
    
    # Try to load font, fallback to default if not available
    try:
        title_font = ImageFont.truetype("arial.ttf", 60)
        value_font = ImageFont.truetype("arialbd.ttf", 120)
        subtitle_font = ImageFont.truetype("arial.ttf", 40)
        name_font = ImageFont.truetype("arial.ttf", 35)
    except:
        title_font = ImageFont.load_default()
        value_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        name_font = ImageFont.load_default()
    
    # Achievement type labels
    type_labels = {
        "distance": "DISTANCE",
        "hexes": "HEXES CAPTURED",
        "streak": "DAY STREAK",
        "runs": "RUNS COMPLETED",
        "faction": "FACTION POWER"
    }
    
    title_text = type_labels.get(achievement_type, achievement_type.upper())
    
    # Draw text (centered)
    # Title
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(
        ((width - title_width) // 2, 120),
        title_text,
        fill=scheme['text'],
        font=title_font
    )
    
    # Value (large, centered in circle)
    value_bbox = draw.textbbox((0, 0), value, font=value_font)
    value_width = value_bbox[2] - value_bbox[0]
    draw.text(
        ((width - value_width) // 2, 320),
        value,
        fill="#ffffff",
        font=value_font
    )
    
    # User name
    name_bbox = draw.textbbox((0, 0), user_name, font=name_font)
    name_width = name_bbox[2] - name_bbox[0]
    draw.text(
        ((width - name_width) // 2, 620),
        user_name,
        fill=scheme['text'],
        font=name_font
    )
    
    # Subtitle
    subtitle_text = "ACHIEVEMENT UNLOCKED"
    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    draw.text(
        ((width - subtitle_width) // 2, 700),
        subtitle_text,
        fill=scheme['text'],
        font=subtitle_font
    )
    
    return img


def generate_qr_code(data: str, size: int = 300, border: int = 2) -> Image.Image:
    """Generate QR code image"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#1a1a2e", back_color="white")
    
    # Resize to requested size
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    
    return img


def image_to_base64(img: Image.Image) -> str:
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()


# API Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "badge-generator", "port": 8011}


@app.post("/badges/achievement")
async def generate_achievement_badge(req: BadgeRequest):
    """Generate achievement badge as base64 PNG"""
    try:
        img = create_achievement_badge(
            req.user_name,
            req.achievement_type,
            req.achievement_value,
            req.color_scheme
        )
        
        base64_img = image_to_base64(img)
        
        return formatter.success({
            "image_base64": base64_img,
            "format": "PNG",
            "size": "800x800"
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/badges/achievement-image")
async def get_achievement_image(
    user_name: str,
    achievement_type: str,
    achievement_value: str,
    color_scheme: str = "green"
):
    """Generate achievement badge as direct PNG image"""
    try:
        img = create_achievement_badge(
            user_name,
            achievement_type,
            achievement_value,
            color_scheme
        )
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return StreamingResponse(img_byte_arr, media_type="image/png")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/badges/qr-code")
async def generate_qr(req: QRRequest):
    """Generate QR code as base64 PNG"""
    try:
        img = generate_qr_code(req.data, req.size, req.border)
        base64_img = image_to_base64(img)
        
        return formatter.success({
            "image_base64": base64_img,
            "format": "PNG",
            "size": f"{req.size}x{req.size}"
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/badges/qr-image")
async def get_qr_image(data: str, size: int = 300):
    """Generate QR code as direct PNG image"""
    try:
        img = generate_qr_code(data, size)
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return StreamingResponse(img_byte_arr, media_type="image/png")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011)

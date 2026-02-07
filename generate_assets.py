#!/usr/bin/env python3
"""
UWtopia Rx - Modern Blue Asset Generator
Creates clean, modern blue icons similar to UWorld style
- Large "Rx" text (prescription symbol style)
- "UWtopia" branding
- "@DrEndris" author credit
- Clean, professional medical blue theme
"""

from PIL import Image, ImageDraw, ImageFont
import sys
import os

# Modern Medical Blue Color Scheme (UWorld-inspired)
PRIMARY_BLUE = '#2E7CEE'      # Bright professional blue
DARK_BLUE = '#1E5BB8'         # Darker blue for depth
LIGHT_BLUE = '#5BA3FF'        # Light blue for accents
WHITE = '#FFFFFF'
GOLD = '#FFD700'              # For "Rx" and author credit

def get_font(size, bold=False):
    """Get the best available font"""
    font_options = [
        '/system/fonts/Roboto-Bold.ttf' if bold else '/system/fonts/Roboto-Regular.ttf',
        '/system/fonts/DroidSans-Bold.ttf' if bold else '/system/fonts/DroidSans.ttf',
        '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf' if bold else '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf',
        None
    ]
    
    for font_path in font_options:
        if font_path and os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except:
                continue
    
    return ImageFont.load_default()

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_gradient_background(draw, width, height, color_top, color_bottom):
    """Create smooth vertical gradient"""
    r1, g1, b1 = hex_to_rgb(color_top)
    r2, g2, b2 = hex_to_rgb(color_bottom)
    
    for y in range(height):
        ratio = y / height
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

def draw_text_with_outline(draw, position, text, font, fill_color, outline_color, outline_width=2):
    """Draw text with outline for better readability"""
    x, y = position
    # Draw outline
    for adj_x in range(-outline_width, outline_width + 1):
        for adj_y in range(-outline_width, outline_width + 1):
            if adj_x != 0 or adj_y != 0:
                draw.text((x + adj_x, y + adj_y), text, font=font, fill=hex_to_rgb(outline_color))
    # Draw main text
    draw.text((x, y), text, font=font, fill=hex_to_rgb(fill_color))

def create_app_icon(size=1024):
    """
    Create modern app icon with:
    - Clean blue gradient background
    - Large "Rx" text (prescription symbol)
    - "UWtopia" text above
    - "@DrEndris" credit below
    """
    print(f"  Creating app icon ({size}x{size})...")
    
    # Create image with gradient
    icon = Image.new('RGB', (size, size), hex_to_rgb(PRIMARY_BLUE))
    draw = ImageDraw.Draw(icon)
    
    # Create gradient background
    create_gradient_background(draw, size, size, LIGHT_BLUE, DARK_BLUE)
    
    # Large "Rx" text in center
    font_rx = get_font(int(size * 0.5), bold=True)
    text_rx = "Rx"
    
    try:
        bbox = draw.textbbox((0, 0), text_rx, font=font_rx)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - int(size * 0.05)
        
        # Draw "Rx" with white color and outline
        draw_text_with_outline(draw, (x, y), text_rx, font_rx, WHITE, DARK_BLUE, 4)
    except Exception as e:
        print(f"    Note: Using default font - {e}")
    
    # "UWtopia" text above Rx
    font_app = get_font(int(size * 0.1), bold=True)
    text_app = "UWtopia"
    
    try:
        bbox = draw.textbbox((0, 0), text_app, font=font_app)
        text_width = bbox[2] - bbox[0]
        x = (size - text_width) // 2
        y = int(size * 0.15)
        
        draw_text_with_outline(draw, (x, y), text_app, font_app, WHITE, DARK_BLUE, 2)
    except:
        pass
    
    # "@DrEndris" credit at bottom
    font_credit = get_font(int(size * 0.055), bold=False)
    credit_text = "@DrEndris"
    
    try:
        bbox = draw.textbbox((0, 0), credit_text, font=font_credit)
        text_width = bbox[2] - bbox[0]
        x = (size - text_width) // 2
        y = int(size * 0.85)
        
        draw_text_with_outline(draw, (x, y), credit_text, font_credit, GOLD, DARK_BLUE, 2)
    except:
        pass
    
    return icon

def create_adaptive_icon(size=1024):
    """
    Create Android adaptive icon
    - Transparent/white background for adaptive masking
    - Large "Rx" symbol
    - Simple, clean design
    """
    print(f"  Creating adaptive icon ({size}x{size})...")
    
    # White background for adaptive icon
    icon = Image.new('RGB', (size, size), hex_to_rgb(WHITE))
    draw = ImageDraw.Draw(icon)
    
    # Create subtle gradient
    create_gradient_background(draw, size, size, WHITE, LIGHT_BLUE)
    
    # Large "Rx" in blue
    font_rx = get_font(int(size * 0.55), bold=True)
    text_rx = "Rx"
    
    try:
        bbox = draw.textbbox((0, 0), text_rx, font=font_rx)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - int(size * 0.08)
        
        draw_text_with_outline(draw, (x, y), text_rx, font_rx, PRIMARY_BLUE, WHITE, 3)
    except:
        pass
    
    # Small "UWtopia" below
    font_app = get_font(int(size * 0.08), bold=True)
    text_app = "UWtopia"
    
    try:
        bbox = draw.textbbox((0, 0), text_app, font=font_app)
        text_width = bbox[2] - bbox[0]
        x = (size - text_width) // 2
        y = int(size * 0.65)
        
        draw_text_with_outline(draw, (x, y), text_app, font_app, PRIMARY_BLUE, WHITE, 2)
    except:
        pass
    
    return icon

def create_splash_screen(width=1284, height=2778):
    """
    Create splash screen with:
    - Blue gradient background
    - Large "Rx" symbol
    - "UWtopia Rx" branding
    - "Medical Question Bank" tagline
    - "@DrEndris" credit
    """
    print(f"  Creating splash screen ({width}x{height})...")
    
    splash = Image.new('RGB', (width, height), hex_to_rgb(PRIMARY_BLUE))
    draw = ImageDraw.Draw(splash)
    
    # Gradient background
    create_gradient_background(draw, width, height, LIGHT_BLUE, DARK_BLUE)
    
    # Large "Rx" in center
    font_rx = get_font(int(width * 0.5), bold=True)
    text_rx = "Rx"
    
    try:
        bbox = draw.textbbox((0, 0), text_rx, font=font_rx)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (width - text_width) // 2
        y = (height - text_height) // 2 - int(height * 0.1)
        
        draw_text_with_outline(draw, (x, y), text_rx, font_rx, WHITE, DARK_BLUE, 5)
    except:
        pass
    
    # "UWtopia Rx" title at top
    font_title = get_font(int(width * 0.12), bold=True)
    text_title = "UWtopia Rx"
    
    try:
        bbox = draw.textbbox((0, 0), text_title, font=font_title)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        y = int(height * 0.15)
        
        draw_text_with_outline(draw, (x, y), text_title, font_title, WHITE, DARK_BLUE, 3)
    except:
        pass
    
    # "Medical Question Bank" subtitle
    font_subtitle = get_font(int(width * 0.06), bold=False)
    subtitle = "Medical Question Bank"
    
    try:
        bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        y = int(height * 0.24)
        
        draw_text_with_outline(draw, (x, y), subtitle, font_subtitle, WHITE, DARK_BLUE, 2)
    except:
        pass
    
    # "@DrEndris" credit at bottom
    font_credit = get_font(int(width * 0.055), bold=False)
    credit = "by @DrEndris"
    
    try:
        bbox = draw.textbbox((0, 0), credit, font=font_credit)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        y = int(height * 0.88)
        
        draw_text_with_outline(draw, (x, y), credit, font_credit, GOLD, DARK_BLUE, 2)
    except:
        pass
    
    return splash

def generate_all_assets():
    """Generate all required assets"""
    print("\n" + "="*60)
    print("UWtopia Rx - Modern Blue Asset Generator")
    print("Creating UWorld-style professional assets...")
    print("="*60 + "\n")
    
    try:
        # 1. App Icon
        print("📱 Generating App Icon:")
        icon = create_app_icon(1024)
        icon.save('assets/icon.png', 'PNG', optimize=True)
        print("    ✓ Saved: assets/icon.png (1024x1024)")
        
        # 2. Adaptive Icon
        print("\n📱 Generating Adaptive Icon:")
        adaptive = create_adaptive_icon(1024)
        adaptive.save('assets/adaptive-icon.png', 'PNG', optimize=True)
        print("    ✓ Saved: assets/adaptive-icon.png (1024x1024)")
        
        # 3. Splash Screen
        print("\n🖼️  Generating Splash Screen:")
        splash = create_splash_screen(1284, 2778)
        splash.save('assets/splash.png', 'PNG', optimize=True)
        print("    ✓ Saved: assets/splash.png (1284x2778)")
        
        # 4. Favicon
        print("\n🌐 Generating Favicon:")
        favicon = icon.resize((48, 48), Image.Resampling.LANCZOS)
        favicon.save('assets/favicon.png', 'PNG', optimize=True)
        print("    ✓ Saved: assets/favicon.png (48x48)")
        
        print("\n" + "="*60)
        print("✅ All assets generated successfully!")
        print("="*60)
        print("\nDesign Style:")
        print("  • Modern clean 'Rx' text design")
        print("  • UWorld-inspired blue theme")
        print("  • Professional medical aesthetic")
        print("  • Clear 'UWtopia' branding")
        print("  • '@DrEndris' author credit")
        print("\n" + "="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR generating assets: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = generate_all_assets()
    sys.exit(0 if success else 1)

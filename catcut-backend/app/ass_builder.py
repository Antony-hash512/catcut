import pysubs2
from typing import List, Dict, Any

def rgb_to_ass_color(hex_color: str, alpha: int = 0) -> str:
    """
    Converts a standard hex color (e.g., '#FFD700' or 'FFD700') to ASS BGR hex format (&HAABBGGRR&).
    """
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
        return f"&H{alpha:02X}{b}{g}{r}&"
    return f"&H{alpha:02X}FFFFFF&"

def group_words_into_lines(words: List[Dict[str, Any]], max_words: int = 3, max_gap: float = 0.8) -> List[List[Dict[str, Any]]]:
    """
    Groups a list of words into phrases/lines based on maximum words per line and time gaps.
    """
    lines = []
    current_line = []
    
    for word in words:
        if not current_line:
            current_line.append(word)
            continue
            
        prev_word = current_line[-1]
        gap = word['start'] - prev_word['end']
        
        if len(current_line) >= max_words or gap > max_gap:
            lines.append(current_line)
            current_line = [word]
        else:
            current_line.append(word)
            
    if current_line:
        lines.append(current_line)
        
    return lines

def hex_to_pysubs2_color(hex_color: str, alpha: int = 0) -> pysubs2.Color:
    """
    Converts a standard hex color to pysubs2.Color object.
    """
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        return pysubs2.Color(r, g, b, alpha)
    return pysubs2.Color(0, 0, 0, alpha)

def build_ass(
    words_data: List[Dict[str, Any]],
    font_name: str = "Montserrat",
    font_size: int = 26,
    active_color_hex: str = "#FFD700",      # Yellow
    inactive_color_hex: str = "#FFFFFF",    # White
    style_mode: str = "active_word",         # "active_word" or "karaoke"
    max_words_per_line: int = 3,
    max_gap_seconds: float = 0.8,
    vertical_shift: int = 0,
    bg_opacity: int = 80,
    text_opacity: int = 100,
    font_bold: bool = True,
    outline_enabled: bool = True,
    outline_width: float = 3.0,
    outline_color_hex: str = "#000000",
    shadow_enabled: bool = False,
    shadow_color_hex: str = "#000000",
    bg_enabled: bool = False,
    bg_color_hex: str = "#000000"
) -> str:
    """
    Generates ASS subtitle content from words data.
    """
    # Create SSA file
    ssa = pysubs2.SSAFile()
    
    # Configure 1080p canvas resolution
    ssa.info["PlayResX"] = 1920
    ssa.info["PlayResY"] = 1080
    
    # Configure default style
    style = pysubs2.SSAStyle()
    style.fontname = font_name
    style.fontsize = font_size
    style.bold = font_bold
    text_alpha = int(round((100 - text_opacity) * 2.55))
    style.primarycolor = pysubs2.Color(255, 255, 255, text_alpha) # Default primary
    style.secondarycolor = pysubs2.Color(0, 215, 255, text_alpha) # Default secondary for karaoke
    
    style.outlinecolor = hex_to_pysubs2_color(outline_color_hex)
    
    if bg_enabled:
        style.borderstyle = 3  # Opaque box background
        bg_alpha = int(round((100 - bg_opacity) * 2.55))
        style.backcolor = hex_to_pysubs2_color(bg_color_hex, bg_alpha)
    else:
        style.borderstyle = 1  # Outline + shadow
        style.backcolor = hex_to_pysubs2_color(shadow_color_hex)
        
    style.outline = outline_width if outline_enabled else 0.0
    style.shadow = 1.0 if shadow_enabled else 0.0
    style.alignment = 5 # Center-middle alignment
    ssa.styles["Default"] = style
    
    # Group words into lines
    lines = group_words_into_lines(words_data, max_words=max_words_per_line, max_gap=max_gap_seconds)
    
    active_color_ass = rgb_to_ass_color(active_color_hex, text_alpha)
    inactive_color_ass = rgb_to_ass_color(inactive_color_hex, text_alpha)
    
    for line in lines:
        if not line:
            continue
            
        line_start_ms = int(line[0]['start'] * 1000)
        line_end_ms = int(line[-1]['end'] * 1000)
        
        if style_mode == "active_word":
            # For each word in the line, create an event where that word is highlighted
            for i, target_word in enumerate(line):
                event_start_ms = int(target_word['start'] * 1000)
                # Set end time to start of next word or end of line
                if i < len(line) - 1:
                    event_end_ms = int(line[i+1]['start'] * 1000)
                else:
                    event_end_ms = int(target_word['end'] * 1000)
                
                # Construct text with active word highlighted
                parts = []
                for w in line:
                    word_text = w['word'].strip()
                    if w == target_word:
                        # Highlight active word (yellow + scale up using \fscx115\fscy115)
                        parts.append(f"{{\\c{active_color_ass}\\fscx115\\fscy115}}{word_text}{{\\fscx100\\fscy100}}")
                    else:
                        # Inactive word
                        parts.append(f"{{\\c{inactive_color_ass}}}{word_text}")
                
                text = f"{{\\pos(960,{540 + vertical_shift})}}" + " ".join(parts)
                event = pysubs2.SSAEvent(start=event_start_ms, end=event_end_ms, text=text)
                ssa.events.append(event)
                
        elif style_mode == "karaoke":
            # Standard karaoke tags: {\k<duration_in_centiseconds>}
            parts = []
            current_time_ms = line_start_ms
            
            for w in line:
                word_start_ms = int(w['start'] * 1000)
                word_end_ms = int(w['end'] * 1000)
                
                # If there's a gap before this word, add empty karaoke duration
                if word_start_ms > current_time_ms:
                    gap_cs = (word_start_ms - current_time_ms) // 10
                    parts.append(f"{{\\k{gap_cs}}}")
                
                duration_cs = (word_end_ms - word_start_ms) // 10
                word_text = w['word'].strip()
                # Use \kf for smooth fill effect if preferred
                parts.append(f"{{\\kf{duration_cs}}}{word_text}")
                current_time_ms = word_end_ms
                
            text = " ".join(parts)
            # Add secondary color override for active filling and positioning
            text = f"{{\\pos(960,{540 + vertical_shift})}}{{\\c{inactive_color_ass}\\2c{active_color_ass}}}" + text
            
            event = pysubs2.SSAEvent(start=line_start_ms, end=line_end_ms, text=text)
            ssa.events.append(event)
            
    # Compile the ssa structure to ASS text
    return ssa.to_string(format_="ass")

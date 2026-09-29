#!/usr/bin/env python3
import os
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'docs' / 'move-x-project-manual.pdf'

INCLUDE_EXTENSIONS = {'.html', '.css', '.js', '.jsx', '.md', '.json'}
EXCLUDE_DIRS = {
    '.git',
    'node_modules',
    'dist',
    'build',
    '.vscode',
    '.idea',
    '__pycache__',
}


def iter_source_files(root: Path):
    for path in sorted(root.rglob('*')):
        if not path.is_file():
            continue
        if any(part in EXCLUDE_DIRS for part in path.parts):
            continue
        if path.suffix.lower() not in INCLUDE_EXTENSIONS:
            continue
        yield path


def draw_wrapped_line(c, text, x, y, max_width, font_name='Courier', font_size=8, indent=0):
    c.setFont(font_name, font_size)
    if c.stringWidth(text, font_name, font_size) <= max_width:
        c.drawString(x + indent, y, text)
        return 1

    # Basic hard-wrap at character boundary for code lines.
    width = 0
    chunk = ''
    lines = 0
    for ch in text:
        w = c.stringWidth(ch, font_name, font_size)
        if width + w > max_width - indent and chunk:
            c.drawString(x + indent, y - lines * 10, chunk)
            lines += 1
            chunk = ch
            width = w
        else:
            chunk += ch
            width += w

    if chunk:
        c.drawString(x + indent, y - lines * 10, chunk)
        lines += 1

    return lines


def ensure_new_page(c, y, margin_bottom, margin_top):
    if y <= margin_bottom:
        c.showPage()
        return margin_top
    return y


def generate_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    width, height = A4

    margin_left = 1.6 * cm
    margin_right = 1.6 * cm
    margin_top = height - 1.6 * cm
    margin_bottom = 1.6 * cm
    usable_width = width - margin_left - margin_right

    y = margin_top

    # Cover
    c.setFont('Helvetica-Bold', 20)
    c.drawString(margin_left, y, 'MOVE-X Project Manual')
    y -= 24
    c.setFont('Helvetica', 10)
    c.drawString(margin_left, y, 'Comprehensive code-level documentation with line-by-line source listing')
    y -= 14
    c.drawString(margin_left, y, f'Project root: {ROOT}')
    y -= 20

    c.setFont('Helvetica-Bold', 12)
    c.drawString(margin_left, y, 'Scope')
    y -= 14
    c.setFont('Helvetica', 10)
    scope_lines = [
        '- UI routing and page composition (React + Vite)',
        '- Components and styling behavior (CSS)',
        '- Admin, rider, and tracking feature flows',
        '- Backend-facing frontend service usage patterns',
        '- Full line-numbered source appendix for included files',
    ]
    for line in scope_lines:
        c.drawString(margin_left, y, line)
        y -= 12

    y -= 8
    c.setFont('Helvetica-Bold', 12)
    c.drawString(margin_left, y, 'Design and UX Interpretation')
    y -= 14
    c.setFont('Helvetica', 10)
    design_lines = [
        'The application is organized around three user journeys: public tracking, rider operations, and admin operations.',
        'UI states prioritize practical feedback: loading, authenticated/unauthenticated guards, operation results, and retry paths.',
        'Tracking is implemented via periodic refresh instead of websocket push, balancing simplicity and reliability.',
    ]
    for line in design_lines:
        lines_used = draw_wrapped_line(c, line, margin_left, y, usable_width, 'Helvetica', 10)
        y -= lines_used * 10 + 2

    c.showPage()
    y = margin_top

    # File-by-file line listings
    for file_path in iter_source_files(ROOT):
        rel = file_path.relative_to(ROOT)
        y = ensure_new_page(c, y, margin_bottom, margin_top)

        c.setFont('Helvetica-Bold', 12)
        c.drawString(margin_left, y, f'File: {rel}')
        y -= 14

        c.setFont('Helvetica', 9)
        c.drawString(margin_left, y, 'Purpose: Source listing with line-level reference for deep review')
        y -= 14

        try:
            text = file_path.read_text(encoding='utf-8', errors='replace').splitlines()
        except Exception as exc:
            c.setFont('Helvetica-Oblique', 9)
            c.drawString(margin_left, y, f'Could not read file: {exc}')
            y -= 16
            continue

        if not text:
            c.setFont('Courier', 8)
            c.drawString(margin_left, y, '0001: <empty file>')
            y -= 12
        else:
            for idx, line in enumerate(text, start=1):
                y = ensure_new_page(c, y, margin_bottom, margin_top)
                numbered = f'{idx:04d}: {line}'
                line_count = draw_wrapped_line(c, numbered, margin_left, y, usable_width, 'Courier', 7.5)
                y -= max(1, line_count) * 9

        y -= 10

    c.save()


if __name__ == '__main__':
    pdfmetrics.getRegisteredFontNames()
    generate_pdf()
    print(OUTPUT)

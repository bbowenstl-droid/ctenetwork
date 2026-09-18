"""Apply the CTE Network v23 shared design assets to every site HTML page.

This script is idempotent and only adds stylesheet/script references; the existing
Sleeper data loading, page content and business logic remain untouched.
Run: python3 tools/apply-design-v23.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STYLE = '<link rel="stylesheet" href="design-v23.css?v=23">'
SCRIPT = '<script src="design-v23.js?v=23"></script>'
changed = []
for page in sorted(ROOT.glob('*.html')):
    source = page.read_text(encoding='utf-8')
    updated = source
    if STYLE not in updated:
        updated = updated.replace('</head>', STYLE + '</head>', 1)
    if SCRIPT not in updated:
        updated = updated.replace('</body>', SCRIPT + '</body>', 1)
    if updated != source:
        page.write_text(updated, encoding='utf-8')
        changed.append(page.name)
print('Updated:', ', '.join(changed) if changed else 'No changes needed')

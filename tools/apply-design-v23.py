"""Integrate CTE Network v23 assets across public HTML pages, without changing league logic.

Run from any directory: python3 tools/apply-design-v23.py
Check without writing: python3 tools/apply-design-v23.py --check
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
STYLE = '<link rel="stylesheet" href="design-v23.css?v=23">'
SCRIPT = '<script src="design-v23.js?v=23"></script>'
EXCLUDED = {'admin.html', 'sleeper-check.html'}
CHECK = '--check' in sys.argv
errors = []
changed = []
for page in sorted(ROOT.glob('*.html')):
    if page.name in EXCLUDED:
        continue
    source = page.read_text(encoding='utf-8')
    if '</head>' not in source or '</body>' not in source:
        errors.append(f'{page.name}: missing head/body closing tag')
        continue
    updated = source
    if STYLE not in updated:
        updated = updated.replace('</head>', STYLE + '</head>', 1)
    if SCRIPT not in updated:
        updated = updated.replace('</body>', SCRIPT + '</body>', 1)
    if updated != source:
        changed.append(page.name)
        if not CHECK:
            page.write_text(updated, encoding='utf-8')
    if updated.count(STYLE) != 1 or updated.count(SCRIPT) != 1:
        errors.append(f'{page.name}: duplicated or missing design asset')
print(('Needs integration: ' if CHECK else 'Updated: ') + (', '.join(changed) if changed else 'none'))
if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
if CHECK and changed:
    sys.exit(1)

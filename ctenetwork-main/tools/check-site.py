"""CTE Network site check: every local link/asset exists, and the commissioner page stays private."""
import re, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
problems = []
for page in sorted(root.glob('*.html')):
    text = page.read_text(encoding='utf-8')
    for ref in re.findall(r'(?:href|src)="([^"#]+)"', text):
        if ref.startswith(('http:', 'https:', 'mailto:', 'data:', 'tel:')) or '${' in ref:
            continue
        target = ref.split('?')[0]
        if target and not (root / target).exists():
            problems.append(f'{page.name}: missing {target}')
    if page.name != 'admin.html' and re.search(r'href="admin\.html', text):
        problems.append(f'{page.name}: links to the commissioner page')
if 'noindex' not in (root / 'admin.html').read_text(encoding='utf-8'):
    problems.append('admin.html: missing noindex')
print('\n'.join(problems) or 'PASS: all local links and assets resolve; commissioner page is private')
sys.exit(1 if problems else 0)

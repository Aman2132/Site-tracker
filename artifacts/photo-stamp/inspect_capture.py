"""Read-only inspection of the newest test capture and its actual image bytes."""
import hashlib
import json
from pathlib import Path
import shlex
import sqlite3
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlparse
from PIL import Image

root = Path(__file__).resolve().parent
label = sys.argv[1]
package = 'com.sitetracker.app'

def read_private(path):
    return subprocess.check_output(['adb', 'exec-out', 'run-as', package, 'cat', shlex.quote(path)])

with tempfile.TemporaryDirectory(prefix='site-tracker-photo-') as temp:
    for suffix in ['', '-wal']:
        (Path(temp) / ('site-tracker.db' + suffix)).write_bytes(read_private('files/SQLite/site-tracker.db' + suffix))
    db = sqlite3.connect(str(Path(temp) / 'site-tracker.db'))
    rows = db.execute("SELECT data FROM photos WHERE origin='local' ORDER BY taken_at DESC").fetchall()
    captures = [json.loads(row[0]) for row in rows]
    photo = next((p for p in captures if p.get('task') == 'Stamp verification'), None)
    if photo is None:
        raise SystemExit('No Stamp verification capture found')
    db.close()

(root / (label + '.json')).write_text(json.dumps(photo, indent=2), encoding='utf-8')
summary = {'id': photo['id'], 'takenAt': photo['takenAt'], 'synced': photo['synced'], 'note': photo.get('note'), 'images': {}}
for kind, uri in [('image', photo['uri']), ('thumb', photo.get('localThumbUri')), ('original', photo.get('localStamp', {}).get('sourceUri'))]:
    if not uri:
        continue
    data = read_private(unquote(urlparse(uri).path))
    path = root / (label + '-' + kind + '.jpg')
    path.write_bytes(data)
    with Image.open(path) as image:
        exif = image.getexif()
        summary['images'][kind] = {'width': image.width, 'height': image.height,
            'orientation': exif.get(274, 1), 'gps': bool(exif.get_ifd(34853)),
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
summary['localStamp'] = photo.get('localStamp')
(root / (label + '-inspection.json')).write_text(json.dumps(summary, indent=2), encoding='utf-8')
print(json.dumps(summary, indent=2))

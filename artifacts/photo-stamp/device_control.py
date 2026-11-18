"""Small ADB helper used for the recorded device verification (no app test hooks)."""
import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
import re

root = Path(__file__).resolve().parent
action = sys.argv[1]
if action == 'screenshot':
    path = root / sys.argv[2]
    path.write_bytes(subprocess.check_output(['adb', 'exec-out', 'screencap', '-p']))
    print(path)
elif action == 'snapshot':
    subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/site-tracker-stamp-window.xml'], check=True, capture_output=True)
    subprocess.run(['adb', 'pull', '/sdcard/site-tracker-stamp-window.xml', str(root / 'device-current.xml')], check=True, capture_output=True)
    for node in ET.parse(root / 'device-current.xml').iter('node'):
        label = node.get('text') or node.get('content-desc')
        if label:
            print(json.dumps({'label': label[:180], 'bounds': node.get('bounds')}, ensure_ascii=True))
elif action == 'tap':
    label = sys.argv[2]
    nodes = ET.parse(root / 'device-current.xml').iter('node')
    match = next((n for n in nodes if label in (n.get('content-desc'), n.get('text'))), None)
    if match is None:
        raise SystemExit('No match in last snapshot: ' + label)
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', match.get('bounds')))
    subprocess.run(['adb', 'shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2)], check=True)

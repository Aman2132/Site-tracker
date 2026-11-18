"""Capture on the observed camera screen with internet radios off; always restore them."""
import json
from pathlib import Path
import subprocess
import sys
import time

root = Path(__file__).resolve().parent

def adb(*args):
    return subprocess.check_output(['adb', 'shell', *args], text=True).strip()

before = {'wifi': adb('settings', 'get', 'global', 'wifi_on'),
          'data': adb('settings', 'get', 'global', 'mobile_data')}
result = {'before': before, 'rendered_offline': False}
try:
    adb('svc', 'wifi', 'disable')
    adb('svc', 'data', 'disable')
    time.sleep(2)
    result['during'] = {'wifi': adb('settings', 'get', 'global', 'wifi_on'),
                        'data': adb('settings', 'get', 'global', 'mobile_data')}
    assert result['during'] == {'wifi': '0', 'data': '0'}, result['during']
    subprocess.run([sys.executable, str(root/'device_control.py'), 'tap', 'Take photo'], check=True)
    for _ in range(8):
        time.sleep(2)
        run = subprocess.run([sys.executable, str(root/'inspect_capture.py'), 'offline-no-note'], capture_output=True, text=True)
        if run.returncode == 0:
            capture = json.loads((root/'offline-no-note.json').read_text(encoding='utf-8'))
            if capture.get('localStamp', {}).get('renderedNote') == '':
                result['rendered_offline'] = True
                result['capture_id'] = capture['id']
                result['synced'] = capture['synced']
                subprocess.run([sys.executable, str(root/'device_control.py'), 'screenshot', 'mobile-offline-capture.png'], check=True)
                break
    assert result['rendered_offline'], 'No completed offline stamp found'
finally:
    adb('svc', 'wifi', 'enable' if before['wifi'] == '1' else 'disable')
    adb('svc', 'data', 'enable' if before['data'] == '1' else 'disable')
    result['restored'] = {'wifi': adb('settings', 'get', 'global', 'wifi_on'),
                          'data': adb('settings', 'get', 'global', 'mobile_data')}
    (root/'offline-verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))

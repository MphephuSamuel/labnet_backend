"""
Simple local HTTP API wrapper for the LabNet Guardian scanner.
Run this script and point the Flutter app SCAN_API_URL at it.
"""

import argparse
import json
import threading
import time
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from scan_network import run_scan

SCAN_INTERVAL = 5


class ScanCache:
    def __init__(self):
        self.lock = threading.Lock()
        self.result = None
        self.last_updated = 0.0
        self.ready = False
        self.error = None

    def set(self, result):
        with self.lock:
            self.result = result
            self.last_updated = time.time()
            self.ready = True
            self.error = None

    def set_error(self, error):
        with self.lock:
            self.error = str(error)
            self.ready = True

    def get(self):
        with self.lock:
            return self.result

    def get_age(self):
        with self.lock:
            return time.time() - self.last_updated if self.ready else None

    def has_result(self):
        with self.lock:
            return self.result is not None


cache = ScanCache()

history_events = []
history_lock = threading.Lock()
last_device_set = set()
MAX_HISTORY_ITEMS = 200


def date_group_for_timestamp(timestamp: float) -> str:
    item_date = datetime.fromtimestamp(timestamp).date()
    today = datetime.now().date()
    if item_date == today:
        return 'Today'
    if item_date == today - timedelta(days=1):
        return 'Yesterday'
    days_ago = (today - item_date).days
    return f'{days_ago} days ago' if days_ago <= 7 else item_date.strftime('%Y-%m-%d')


def add_history_event(event: dict):
    with history_lock:
        history_events.insert(0, event)
        if len(history_events) > MAX_HISTORY_ITEMS:
            history_events.pop()


def get_history(query: str = ''):
    with history_lock:
        events = list(history_events)
    if query:
        q = query.lower()
        events = [event for event in events if q in event['title'].lower() or q in event['device'].lower() or q in event['ip'].lower()]
    return events


def record_history(result: dict):
    global last_device_set
    timestamp = time.time()
    date_group = date_group_for_timestamp(timestamp)

    devices = result.get('devices', []) or []
    current_device_set = {device.get('ip') for device in devices if device.get('ip')}

    added_ips = current_device_set - last_device_set
    removed_ips = last_device_set - current_device_set

    for device in devices:
        ip = device.get('ip')
        if ip in added_ips:
            add_history_event({
                'id': f'history-connect-{ip}-{int(timestamp)}',
                'title': 'Device connected to network',
                'device': device.get('device_type') or device.get('hostname') or ip,
                'ip': ip,
                'time': datetime.fromtimestamp(timestamp).strftime('%I:%M %p'),
                'date_group': date_group,
                'type': 'connection',
            })

    for ip in removed_ips:
        add_history_event({
            'id': f'history-disconnect-{ip}-{int(timestamp)}',
            'title': 'Device disconnected from network',
            'device': ip,
            'ip': ip,
            'time': datetime.fromtimestamp(timestamp).strftime('%I:%M %p'),
            'date_group': date_group,
            'type': 'disconnection',
        })

    for alert in result.get('alerts', []):
        add_history_event({
            'id': alert.get('id') or f'history-alert-{int(timestamp)}',
            'title': alert.get('title', 'Alert detected'),
            'device': alert.get('device', 'Unknown'),
            'ip': alert.get('ip', 'N/A'),
            'time': alert.get('time') or datetime.fromtimestamp(timestamp).strftime('%I:%M %p'),
            'date_group': date_group,
            'type': 'anomaly',
        })

    add_history_event({
        'id': f'history-scan-{int(timestamp)}',
        'title': 'Security scan completed',
        'device': 'SYSTEM',
        'ip': result.get('local_ip') or 'N/A',
        'time': datetime.fromtimestamp(timestamp).strftime('%I:%M %p'),
        'date_group': date_group,
        'type': 'scan',
    })

    last_device_set = current_device_set


def scan_loop(interval=SCAN_INTERVAL):
    while True:
        try:
            result = run_scan()
            record_history(result)
            cache.set(result)
        except Exception as exc:
            cache.set_error(exc)
            print(f'[!] Scanner error: {exc}')
        time.sleep(interval)


class ScanRequestHandler(BaseHTTPRequestHandler):
    def send_json(self, data, status=200):
        body = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def get_cached_result(self):
        result = cache.get()
        if result is not None:
            return result

        if not cache.ready:
            try:
                result = run_scan()
                cache.set(result)
                return result
            except Exception as exc:
                cache.set_error(exc)

        return {
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'local_ip': None,
            'gateway': None,
            'subnet': None,
            'devices': [],
            'summary': {
                'activeDevices': 0,
                'averageBandwidth': 0,
                'threatsBlocked': 0,
                'anomalies': 0,
            },
            'alerts': [
                {
                    'id': 'api-001',
                    'title': 'Scanner not ready',
                    'description': 'The backend scanner is still starting or encountered an error.',
                    'device': 'System',
                    'ip': 'N/A',
                    'time': 'now',
                    'severity': 'warning',
                }
            ],
        }

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        result = self.get_cached_result()

        if path == '/api/devices':
            self.send_json(result.get('devices', []))
        elif path == '/api/summary':
            self.send_json(result.get('summary', {}))
        elif path == '/api/alerts':
            self.send_json(result.get('alerts', []))
        elif path == '/api/history':
            query = ''
            params = parse_qs(parsed.query)
            if 'q' in params and params['q']:
                query = params['q'][0]
            self.send_json(get_history(query=query))
        elif path == '/api/status':
            status_payload = {
                'status': 'ok' if cache.has_result() else 'starting',
                'timestamp': result.get('timestamp'),
                'deviceCount': len(result.get('devices', [])),
                'cacheAgeSeconds': cache.get_age(),
            }
            self.send_json(status_payload)
        else:
            self.send_json({'error': 'Not Found'}, status=404)

    def log_message(self, format, *args):
        return


def run_server(host='0.0.0.0', port=5000):
    scanner_thread = threading.Thread(target=scan_loop, daemon=True)
    scanner_thread.start()

    server = ThreadingHTTPServer((host, port), ScanRequestHandler)
    print(f'LabNet Guardian scan API running at http://{host}:{port}')
    print('Available endpoints: /api/devices, /api/summary, /api/alerts, /api/history, /api/status')
    server.serve_forever()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run the LabNet Guardian scanner HTTP API.')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind the scanner API to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind the scanner API to')
    args = parser.parse_args()

    run_server(host=args.host, port=args.port)

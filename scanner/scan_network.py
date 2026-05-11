"""
LabNet Guardian - Continuous Network Scanner
Scans your Wi-Fi network on a loop, detects devices joining/leaving,
and tracks bandwidth usage per device.

Requirements:
    pip install scapy requests psutil

Run as Administrator:
    python scan_network.py
"""

import socket
import subprocess
import time
import os
import sys
import threading
import json
import ctypes
import platform
from datetime import datetime
from collections import defaultdict
from pathlib import Path

# Configure stdout to handle unicode correctly on Windows
if sys.stdout and sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

try:
    from scapy.all import ARP, Ether, srp, conf, sniff, IP, TCP, UDP
except ImportError:
    print("[-] scapy not found. Install it with: pip install scapy")
    raise

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("[!] psutil not found. Bandwidth tracking disabled. Install with: pip install psutil")

try:
    import socketio
    SOCKETIO_AVAILABLE = True
    sio = socketio.Client()
except ImportError:
    SOCKETIO_AVAILABLE = False
    print("[-] python-socketio not found. Real-time streaming disabled. Install with: pip install \"python-socketio[client]\" websocket-client")


# ── Config ───────────────────────────────────────────────────────────────────

SCAN_INTERVAL    = 5 # seconds between scans
ARP_TIMEOUT      = 3    # seconds to wait for ARP replies
BANDWIDTH_WINDOW = 60   # seconds to average bandwidth over
DATASET_DIR      = Path("./labnguardian_data")  # Directory for persistent data

# Debug/Testing flags
DISABLE_PERSISTENT_SAVE = True  # Set to False to enable bandwidth history saving
NEW_DEVICE_GRACE_PERIOD = 120  # seconds before treating new device as suspicious (0 to disable)

# Anomaly detection thresholds (tuned to reduce false positives)
BANDWIDTH_SPIKE_MIN_BPS = 100_000  # Minimum 100 KB/s to trigger (ignore noise on idle devices)
BANDWIDTH_SPIKE_RATIO = 3.0  # Must be 3x baseline
PORT_SCAN_THRESHOLD = 50  # unique ports in 60s
AUTH_FAILURE_THRESHOLD = 5  # failed auth attempts in 60s
TETHERING_THRESHOLD = 10  # hidden IPs before flagging (increased from 5 to reduce false positives)
PROTOCOL_SHIFT_PERSISTENCE = 2  # require 2+ intervals of protocol dominance
UNUSUAL_PORT_ACTIVITY_MIN_PORTS = 15  # increased from 12
UNUSUAL_PORT_ACTIVITY_RATIO = 4.0  # increased from 3.0


# ── Device Type lookup ─────────────────────────────────────────────────────────────

DEVICE_TYPE_CACHE = {}

def get_device_type(mac: str) -> str:
    if mac in DEVICE_TYPE_CACHE:
        return DEVICE_TYPE_CACHE[mac]
    if not REQUESTS_AVAILABLE:
        return "Unknown"
    try:
        resp = requests.get(f"https://api.macvendors.com/{mac}", timeout=3)
        vendor = resp.text.strip() if resp.status_code == 200 else "Unknown"
        # Map vendor to device type
        device_type = map_vendor_to_device_type(vendor)
    except Exception:
        device_type = "Unknown"
    DEVICE_TYPE_CACHE[mac] = device_type
    return device_type

def map_vendor_to_device_type(vendor: str) -> str:
    vendor_lower = vendor.lower()
    if "apple" in vendor_lower:
        return "Mobile Device"
    elif "samsung" in vendor_lower:
        return "Mobile Device"
    elif "huawei" in vendor_lower:
        return "Mobile Device"
    elif "xiaomi" in vendor_lower:
        return "Mobile Device"
    elif "oneplus" in vendor_lower:
        return "Mobile Device"
    elif "google" in vendor_lower:
        return "Mobile Device"
    elif "motorola" in vendor_lower:
        return "Mobile Device"
    elif "lg" in vendor_lower:
        return "Mobile Device"
    elif "asus" in vendor_lower:
        return "Computer"
    elif "dell" in vendor_lower:
        return "Computer"
    elif "hp" in vendor_lower:
        return "Computer"
    elif "lenovo" in vendor_lower:
        return "Computer"
    elif "acer" in vendor_lower:
        return "Computer"
    elif "microsoft" in vendor_lower:
        return "Computer"
    elif "tp-link" in vendor_lower or "netgear" in vendor_lower or "d-link" in vendor_lower:
        return "Router/Network Device"
    elif "cisco" in vendor_lower:
        return "Router/Network Device"
    elif "ubiquiti" in vendor_lower:
        return "Router/Network Device"
    else:
        return "Unknown Device"


# ── Hostname resolution ───────────────────────────────────────────────────────

HOSTNAME_CACHE = {}

def get_hostname(ip: str) -> str:
    if ip in HOSTNAME_CACHE:
        return HOSTNAME_CACHE[ip]
    try:
        name = socket.gethostbyaddr(ip)[0]
    except Exception:
        name = "N/A"
    HOSTNAME_CACHE[ip] = name
    return name


# ── Network helpers ───────────────────────────────────────────────────────────

def get_local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return None


def get_default_gateway():
    try:
        output = subprocess.check_output("route print 0.0.0.0", shell=True).decode(errors="ignore")
        for line in output.splitlines():
            parts = line.split()
            if len(parts) >= 3 and parts[0] == "0.0.0.0" and parts[1] == "0.0.0.0":
                return parts[2]
    except Exception:
        pass
    return None


def guess_subnet(local_ip: str) -> str:
    parts = local_ip.rsplit(".", 1)
    return f"{parts[0]}.0/24"


def get_interface_for_ip(local_ip: str) -> str | None:
    """Find the system network interface associated with the local IP."""
    if not PSUTIL_AVAILABLE or not local_ip:
        return None
    try:
        for iface, addrs in psutil.net_if_addrs().items():
            for addr in addrs:
                if addr.family == socket.AF_INET and addr.address == local_ip:
                    return iface
    except Exception:
        pass
    return None


# ── ARP scan ──────────────────────────────────────────────────────────────────

def arp_scan(subnet: str, retries: int = 2) -> dict:
    """Returns {ip: mac} for all responding devices. Retries on failure."""
    conf.verb = 0
    for attempt in range(retries):
        try:
            packet = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=subnet)
            answered, _ = srp(packet, timeout=ARP_TIMEOUT, retry=1)
            if answered:
                return {rcv.psrc: rcv.hwsrc.upper() for _, rcv in answered}
        except Exception as e:
            pass

    # Fallback to system ARP cache (mostly for Windows without winpcap)
    try:
        output = subprocess.check_output("arp -a", shell=True).decode(errors="ignore")
        devices = {}
        subnet_prefix = subnet.rsplit(".", 1)[0] if "." in subnet else ""
        for line in output.splitlines():
            parts = line.split()
            if len(parts) >= 3 and parts[0].count(".") == 3 and "-" in parts[1]:
                ip = parts[0]
                mac = parts[1].replace("-", ":").upper()
                if ip.startswith(subnet_prefix + "."):
                    devices[ip] = mac
        return devices
    except Exception as e:
        print(f"[-] Unexpected error during ARP scan fallback: {e}")
    return {}

# ── Packet Sniffer ───────────────────────────────────────────────────────────

class PacketSniffer:
    """
    Background packet sniffer to detect:
    - Port scans (TCP SYN attempts to multiple ports)
    - Auth anomalies (failures on ports 22/443)
    - Tracks per-source IP statistics and per-IP bandwidth
    - Observes traffic involving known network IPs
    - Tracks protocol and flow characteristics for profiling and anomaly detection
    """

    def __init__(self):
        self.tcp_syns = defaultdict(lambda: defaultdict(int))      # src_ip -> {port: count}
        self.syn_times = defaultdict(list)                         # src_ip -> [timestamps]
        self.auth_rejections = defaultdict(int)                    # src_ip -> count
        self.rejection_times = defaultdict(list)                   # src_ip -> [timestamps]
        self.is_sniffing = False

        # For bandwidth accounting
        self.bytes_tx = defaultdict(int)   # src_ip -> bytes sent
        self.bytes_rx = defaultdict(int)   # dst_ip -> bytes received
        self.bytes_last = defaultdict(int) # ip -> last cumulative bytes
        self.bytes_interval = defaultdict(int)  # ip -> bytes since last interval
        self.last_bandwidth_ts = time.time()

        # For tethering detection: track destination IPs per source IP
        self.traffic_dests = defaultdict(set)  # src_ip -> set of dst_ips seen

        # For traffic profiling
        self.protocol_counts = defaultdict(lambda: defaultdict(int))  # src_ip -> {protocol: count}
        self.port_counts = defaultdict(lambda: defaultdict(int))      # src_ip -> {port: count}
        self.flow_counts = defaultdict(lambda: defaultdict(int))      # src_ip -> {dst_ip: packet_count}

        # Known IPs from ARP scan (updated each scan)
        self.known_ips = set()  # IPs we've seen in ARP scans

    def set_known_ips(self, ips: set):
        """Update the set of known network IPs from ARP scan."""
        self.known_ips = ips.copy()

    def packet_callback(self, packet):
        """Process each captured packet."""
        try:
            if not packet.haslayer(IP):
                return

            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            now = time.time()

            # Track ANY traffic involving known network IPs (not just local machine)
            if src_ip in self.known_ips or dst_ip in self.known_ips:
                pkt_len = len(packet)
                if src_ip in self.known_ips:
                    self.bytes_tx[src_ip] += pkt_len
                if dst_ip in self.known_ips:
                    self.bytes_rx[dst_ip] += pkt_len

                if src_ip in self.known_ips:
                    self.traffic_dests[src_ip].add(dst_ip)

            if packet.haslayer(TCP):
                tcp_layer = packet[TCP]
                self.protocol_counts[src_ip]["TCP"] += 1
                self.flow_counts[src_ip][dst_ip] += 1

                if tcp_layer.flags & 0x02:  # SYN flag set
                    dst_port = tcp_layer.dport
                    self.tcp_syns[src_ip][dst_port] += 1
                    self.syn_times[src_ip].append((now, dst_port))
                    self.port_counts[src_ip][dst_port] += 1

                if tcp_layer.flags & 0x04:  # RST flag set
                    if tcp_layer.dport in [22, 443]:
                        self.auth_rejections[src_ip] += 1
                        self.rejection_times[src_ip].append(now)

            elif packet.haslayer(UDP):
                self.protocol_counts[src_ip]["UDP"] += 1
                self.flow_counts[src_ip][dst_ip] += 1
            else:
                proto = str(packet[IP].proto)
                self.protocol_counts[src_ip][proto] += 1
                self.flow_counts[src_ip][dst_ip] += 1

        except Exception:
            pass  # Silently ignore malformed packets

    def get_port_scan_count(self, src_ip: str, window=60) -> int:
        """Get unique ports attempted in last N seconds."""
        now = time.time()
        cutoff = now - window
        self.syn_times[src_ip] = [(t, p) for t, p in self.syn_times[src_ip] if t >= cutoff]
        unique_ports = set(p for _, p in self.syn_times[src_ip])
        return len(unique_ports)

    def get_auth_rejection_count(self, src_ip: str, window=60) -> int:
        """Get auth failures in last N seconds."""
        now = time.time()
        cutoff = now - window
        self.rejection_times[src_ip] = [t for t in self.rejection_times[src_ip] if t >= cutoff]
        return len(self.rejection_times[src_ip])

    def compute_ip_bps(self):
        """Return a map of IP to B/s using delta of observed bytes and interval."""
        now = time.time()
        elapsed = now - self.last_bandwidth_ts
        if elapsed <= 0:
            self.bytes_interval.clear()
            return {}

        bps = {}
        seen_ips = set(list(self.bytes_tx.keys()) + list(self.bytes_rx.keys()))

        for ip in seen_ips:
            total = self.bytes_tx.get(ip, 0) + self.bytes_rx.get(ip, 0)
            previous = self.bytes_last.get(ip, 0)
            delta = total - previous
            self.bytes_interval[ip] = delta
            bps[ip] = delta / elapsed if elapsed > 0 else 0.0
            self.bytes_last[ip] = total

        self.last_bandwidth_ts = now
        return bps

    def get_recent_ip_weights(self) -> dict:
        """Return bytes observed for known IPs during the last interval."""
        return {ip: bytes_count for ip, bytes_count in self.bytes_interval.items() if bytes_count > 0}

    def collect_interval_stats(self):
        """Capture protocol, port, and flow stats for the latest scan interval."""
        protocol_snapshot = {ip: dict(counts) for ip, counts in self.protocol_counts.items()}
        port_snapshot = {ip: dict(counts) for ip, counts in self.port_counts.items()}
        flow_snapshot = {ip: dict(counts) for ip, counts in self.flow_counts.items()}

        self.protocol_counts.clear()
        self.port_counts.clear()
        self.flow_counts.clear()

        return protocol_snapshot, port_snapshot, flow_snapshot

    def get_hidden_ips(self, src_ip: str, known_arp_ips: set) -> set:
        """
        Return IPs that a device (src_ip) communicates with that are:
        1. NOT in the ARP scan (hidden)
        2. Are in PRIVATE ranges (10.x, 172.16-31.x, 192.168.x)

        This filters out normal internet traffic and focuses on actual hidden networks
        (i.e., hotspot/tether scenario with hidden devices).
        """
        all_dests = self.traffic_dests.get(src_ip, set())
        hidden = all_dests - known_arp_ips
        private_hidden = set()
        for ip in hidden:
            try:
                octets = ip.split('.')
                if len(octets) != 4:
                    continue
                first = int(octets[0])
                second = int(octets[1])
                if first == 10:
                    private_hidden.add(ip)
                elif first == 172 and 16 <= second <= 31:
                    private_hidden.add(ip)
                elif first == 192 and second == 168:
                    private_hidden.add(ip)
            except:
                pass
        return private_hidden


class DeviceProfiler:
    """
    Builds behavioral profiles for devices by tracking bandwidth, protocol usage,
    and common destination ports over a rolling interval.
    """

    def __init__(self):
        self.profiles = defaultdict(lambda: {
            "bps_history": [],
            "protocol_history": [],
            "port_history": [],
            "seen_ips": set(),
            "last_seen": 0,
        })
        self.window = 300

    def _prune_history(self, history):
        cutoff = time.time() - self.window
        return [(t, data) for t, data in history if t >= cutoff]

    def update_profile(self, mac: str, ip: str, bps: float, protocol_counts: dict, port_counts: dict):
        profile = self.profiles[mac]
        now = time.time()
        profile["last_seen"] = now
        profile["seen_ips"].add(ip)

        if bps is not None:
            profile["bps_history"].append((now, bps))

        profile["protocol_history"].append((now, dict(protocol_counts or {})))
        profile["port_history"].append((now, dict(port_counts or {})))

        profile["bps_history"] = self._prune_history(profile["bps_history"])
        profile["protocol_history"] = self._prune_history(profile["protocol_history"])
        profile["port_history"] = self._prune_history(profile["port_history"])

    def _aggregate_counts(self, history):
        totals = defaultdict(int)
        for _, counts in history:
            for key, value in counts.items():
                totals[key] += value
        return totals

    def get_baseline_bps(self, mac: str) -> float:
        history = self.profiles[mac]["bps_history"]
        if not history:
            return 0.0
        return sum(b for _, b in history) / len(history)

    def get_baseline_protocols(self, mac: str) -> dict:
        return dict(self._aggregate_counts(self.profiles[mac]["protocol_history"]))

    def get_baseline_ports(self, mac: str) -> dict:
        return dict(self._aggregate_counts(self.profiles[mac]["protocol_history"]))

    def get_top_port_count(self, mac: str) -> int:
        ports = self.get_baseline_ports(mac)
        return len(ports)

    def get_primary_protocol(self, mac: str) -> str:
        protocols = self.get_baseline_protocols(mac)
        if not protocols:
            return ""
        return max(protocols.items(), key=lambda x: x[1])[0]

    def get_current_profile(self, mac: str) -> dict:
        return self.profiles.get(mac, {})


# ── Anomaly Detection ────────────────────────────────────────────────────────

class AnomalyDetector:
    """
    Multi-layered anomaly detection system:
    1. Profile-based bandwidth anomaly detection
    2. Port scan detection (>50 unique ports in 60s)
    3. Rogue device detection (unregistered MAC)
    4. Authentication anomaly (failed auth on 22/443)
    5. Protocol/flow shift detection from device baseline
    """

    def __init__(self, sniffer, profiler=None, z_score_threshold=2.5, port_scan_threshold=None, auth_threshold=None, tether_threshold=None):
        self.sniffer = sniffer
        self.profiler = profiler or DeviceProfiler()
        self.z_score_threshold = z_score_threshold
        self.port_scan_threshold = port_scan_threshold or PORT_SCAN_THRESHOLD
        self.auth_threshold = auth_threshold or AUTH_FAILURE_THRESHOLD
        self.tether_threshold = tether_threshold or TETHERING_THRESHOLD

        self.bandwidth_history = defaultdict(list)
        self.known_macs = set()
        self.new_device_timestamps = {}  # mac -> first_seen_time (for grace period)
        self.protocol_shift_count = defaultdict(int)  # mac -> consecutive shift intervals
        self.alerts = []
        self.ip_to_mac = {}

    def update_bandwidth_history(self, mac: str, bps: float):
        now = time.time()
        self.bandwidth_history[mac].append((now, bps))
        cutoff = now - 300
        self.bandwidth_history[mac] = [(t, b) for t, b in self.bandwidth_history[mac] if t >= cutoff]

    def detect_bandwidth_spike(self, mac: str, current_bps: float) -> dict or None:
        # Ignore negligible traffic (idle devices with noise)
        if current_bps < BANDWIDTH_SPIKE_MIN_BPS:
            return None

        baseline = self.profiler.get_baseline_bps(mac)
        if baseline and current_bps > baseline * BANDWIDTH_SPIKE_RATIO and current_bps > BANDWIDTH_SPIKE_MIN_BPS:
            return {
                "type": "BANDWIDTH_SPIKE",
                "severity": "HIGH",
                "message": f"Bandwidth spike detected: {format_bps(current_bps)} vs baseline {format_bps(baseline)}",
                "mac": mac,
                "value": current_bps,
            }

        history = self.bandwidth_history.get(mac, [])
        if len(history) < 10:
            return None

        bps_values = [b for _, b in history]
        mean = sum(bps_values) / len(bps_values)
        variance = sum((x - mean) ** 2 for x in bps_values) / len(bps_values)
        if variance == 0 or mean < BANDWIDTH_SPIKE_MIN_BPS:
            return None

        std_dev = variance ** 0.5
        z_score = (current_bps - mean) / std_dev if std_dev > 0 else 0
        if z_score > self.z_score_threshold and current_bps > BANDWIDTH_SPIKE_MIN_BPS:
            return {
                "type": "BANDWIDTH_SPIKE",
                "severity": "HIGH",
                "message": f"Bandwidth spike detected: {format_bps(current_bps)} (Z-score: {z_score:.2f})",
                "mac": mac,
                "value": current_bps,
            }
        return None

    def detect_port_scan(self, ip: str, mac: str) -> dict or None:
        port_count = self.sniffer.get_port_scan_count(ip, window=60)
        if port_count > self.port_scan_threshold:
            return {
                "type": "PORT_SCAN",
                "severity": "HIGH",
                "message": f"Port scan detected: {port_count} unique ports in 60s",
                "mac": mac,
                "value": port_count,
            }
        return None

    def detect_rogue_device(self, mac: str, is_new: bool) -> dict or None:
        if is_new and mac not in self.known_macs:
            # Apply grace period: only alert if device has been connected for grace period
            now = time.time()
            if mac not in self.new_device_timestamps:
                self.new_device_timestamps[mac] = now
                return None  # First time seen, defer alert
            
            if NEW_DEVICE_GRACE_PERIOD > 0:
                elapsed = now - self.new_device_timestamps[mac]
                if elapsed < NEW_DEVICE_GRACE_PERIOD:
                    return None  # Still within grace period
            
            return {
                "type": "ROGUE_DEVICE",
                "severity": "MEDIUM",
                "message": f"Unregistered device joined: {mac}",
                "mac": mac,
                "value": mac,
            }
        elif not is_new and mac in self.new_device_timestamps:
            del self.new_device_timestamps[mac]  # Device is now known, clear grace period
        return None

    def detect_tethering(self, ip: str, mac: str, known_arp_ips: set) -> dict or None:
        hidden_ips = self.sniffer.get_hidden_ips(ip, known_arp_ips)
        if len(hidden_ips) >= self.tether_threshold:
            hidden_list = ", ".join(list(hidden_ips)[:3])
            if len(hidden_ips) > 3:
                hidden_list += f", +{len(hidden_ips) - 3} more"
            return {
                "type": "TETHERING",
                "severity": "HIGH",
                "message": f"Hotspot/Tethering detected: device communicating with {len(hidden_ips)} hidden IPs ({hidden_list})",
                "mac": mac,
                "value": hidden_ips,
            }
        return None

    def detect_auth_anomaly(self, ip: str, mac: str, local_ip: str) -> dict or None:
        if ip == local_ip:
            return None
        rejection_count = self.sniffer.get_auth_rejection_count(ip, window=60)
        if rejection_count >= self.auth_threshold:
            return {
                "type": "AUTH_ANOMALY",
                "severity": "HIGH",
                "message": f"Brute force attempt detected: {rejection_count} failed auth in 60s",
                "mac": mac,
                "value": rejection_count,
            }
        return None

    def detect_protocol_shift(self, mac: str, current_protocols: dict) -> dict or None:
        if not current_protocols:
            self.protocol_shift_count[mac] = 0
            return None

        baseline_protocols = self.profiler.get_baseline_protocols(mac)
        if not baseline_protocols:
            self.protocol_shift_count[mac] = 0
            return None

        current_total = sum(current_protocols.values())
        if current_total == 0:
            self.protocol_shift_count[mac] = 0
            return None

        current_primary = max(current_protocols.items(), key=lambda x: x[1])[0]
        baseline_primary = self.profiler.get_primary_protocol(mac)
        if not baseline_primary or current_primary == baseline_primary:
            self.protocol_shift_count[mac] = 0
            return None

        current_primary_ratio = current_protocols[current_primary] / current_total
        if current_primary_ratio >= 0.6:
            self.protocol_shift_count[mac] += 1
            # Only alert after persistence threshold (multiple intervals)
            if self.protocol_shift_count[mac] >= PROTOCOL_SHIFT_PERSISTENCE:
                return {
                    "type": "PROTOCOL_SHIFT",
                    "severity": "MEDIUM",
                    "message": f"Protocol shift detected: {current_primary} traffic now dominant for {mac}",
                    "mac": mac,
                    "value": current_primary,
                }
        else:
            self.protocol_shift_count[mac] = 0
        return None

    def detect_unusual_port_activity(self, mac: str, current_ports: dict) -> dict or None:
        if not current_ports:
            return None

        baseline_port_count = self.profiler.get_top_port_count(mac)
        if baseline_port_count and len(current_ports) > baseline_port_count * UNUSUAL_PORT_ACTIVITY_RATIO and len(current_ports) >= UNUSUAL_PORT_ACTIVITY_MIN_PORTS:
            return {
                "type": "UNUSUAL_PORT_ACTIVITY",
                "severity": "MEDIUM",
                "message": f"Unusual port activity: {len(current_ports)} destination ports seen",
                "mac": mac,
                "value": len(current_ports),
            }
        return None

    def check_anomalies(self, devices: dict, tracker, new_macs: set, known_devices: dict, ip_bps: dict = None, protocol_counts: dict = None, port_counts: dict = None, local_ip: str = None) -> list:
        self.alerts = []
        for mac in known_devices.keys():
            self.known_macs.add(mac)

        known_arp_ips = set(devices.keys())

        for ip, info in devices.items():
            mac = info["mac"]
            self.ip_to_mac[ip] = mac
            bps = ip_bps.get(ip, 0.0) if ip_bps is not None else (tracker.get_bps(mac) if PSUTIL_AVAILABLE else 0)

            self.profiler.update_profile(
                mac,
                ip,
                bps,
                protocol_counts.get(ip, {}) if protocol_counts else {},
                port_counts.get(ip, {}) if port_counts else {}
            )

            if PSUTIL_AVAILABLE:
                self.update_bandwidth_history(mac, bps)
                spike_alert = self.detect_bandwidth_spike(mac, bps)
                if spike_alert:
                    self.alerts.append(spike_alert)

            port_alert = self.detect_port_scan(ip, mac)
            if port_alert:
                self.alerts.append(port_alert)

            auth_alert = self.detect_auth_anomaly(ip, mac, local_ip)
            if auth_alert:
                self.alerts.append(auth_alert)

            tether_alert = self.detect_tethering(ip, mac, known_arp_ips)
            if tether_alert:
                self.alerts.append(tether_alert)

            protocol_alert = self.detect_protocol_shift(mac, current_protocols=protocol_counts.get(ip, {}) if protocol_counts else {})
            if protocol_alert:
                self.alerts.append(protocol_alert)

            port_activity_alert = self.detect_unusual_port_activity(mac, current_ports=port_counts.get(ip, {}) if port_counts else {})
            if port_activity_alert:
                self.alerts.append(port_activity_alert)

            rogue_alert = self.detect_rogue_device(mac, mac in new_macs)
            if rogue_alert:
                self.alerts.append(rogue_alert)

        return self.alerts


# ── Bandwidth tracking ────────────────────────────────────────────────────────

class BandwidthTracker:
    """
    Tracks per-device bandwidth using:
    1. Packet sniffer data (primary, most accurate) — per IP
    2. Fallback to psutil estimation (equal distribution) — if sniffer unavailable
    3. Persistent storage of average bandwidth per MAC for historical trending
    
    Uses exponential moving average (EMA) to smooth spikes and trend data.
    """

    def __init__(self, local_ip: str | None = None):
        self.local_ip = local_ip
        self.interface_name = get_interface_for_ip(local_ip)
        self.last_time  = time.time()
        self.last_bytes = self._total_bytes()
        self.samples    = defaultdict(list)   # mac -> [(timestamp, bps), ...]
        self.ip_to_mac  = {}                  # ip -> mac mapping (updated each scan)
        self.mac_to_ip  = {}                  # mac -> ip mapping (updated each scan)
        
        # EMA smoothing (alpha=0.3 for moderate smoothing)
        self.ema_bandwidth = defaultdict(float)  # mac -> exponential moving average
        self.ema_alpha = 0.3
        
        # Track data sources: which MACs have real packet sniffer data
        self.has_sniffer_data = set()  # MACs with observed packet data
        
        # Persistent storage
        DATASET_DIR.mkdir(exist_ok=True)
        self.bandwidth_file = DATASET_DIR / "bandwidth_history.json"
        self.persistent_data = self._load_persistent()

    def _get_interface_bytes(self) -> int:
        if not PSUTIL_AVAILABLE:
            return 0
        try:
            if self.interface_name:
                counters = psutil.net_io_counters(pernic=True)
                if self.interface_name in counters:
                    io = counters[self.interface_name]
                    return io.bytes_sent + io.bytes_recv
            io = psutil.net_io_counters()
            return io.bytes_sent + io.bytes_recv
        except Exception:
            return 0

    def _total_bytes(self) -> int:
        return self._get_interface_bytes()

    def _load_persistent(self) -> dict:
        """Load historical bandwidth data from disk."""
        if not self.bandwidth_file.exists():
            return {}
        try:
            with open(self.bandwidth_file, "r") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_persistent(self):
        """Save bandwidth trends to disk (average per MAC)."""
        if DISABLE_PERSISTENT_SAVE:
            return  # Disabled for testing/development
        try:
            with open(self.bandwidth_file, "w") as f:
                json.dump(self.persistent_data, f, indent=2)
        except Exception:
            pass  # Silently fail if unable to write

    def set_ip_mac_mapping(self, ip_to_mac: dict, mac_to_ip: dict):
        """Update the IP<->MAC mappings (called from main loop)."""
        self.ip_to_mac = ip_to_mac.copy()
        self.mac_to_ip = mac_to_ip.copy()

    def ingest_packet_sniffer_bps(self, ip_bps: dict):
        """
        Ingest per-IP bandwidth from packet sniffer (most accurate data source).
        Converts IP-level data to MAC-level by looking up the IP->MAC mapping.
        Args:
            ip_bps: {ip: bytes_per_second}
        """
        now = time.time()

        for ip, bps in ip_bps.items():
            mac = self.ip_to_mac.get(ip)
            if mac:
                self.has_sniffer_data.add(mac)

                if mac in self.ema_bandwidth:
                    smoothed_bps = (self.ema_alpha * bps) + ((1 - self.ema_alpha) * self.ema_bandwidth[mac])
                else:
                    smoothed_bps = bps

                self.ema_bandwidth[mac] = smoothed_bps
                self.samples[mac].append((now, smoothed_bps))

                cutoff = now - BANDWIDTH_WINDOW
                self.samples[mac] = [(t, b) for t, b in self.samples[mac] if t >= cutoff]

    def update(self, active_macs: list, traffic_weights: dict = None):
        """
        Fallback: distribute total bandwidth using weighted distribution.
        Devices with observed traffic get higher allocation; silent devices get baseline.
        """
        if not PSUTIL_AVAILABLE or not active_macs:
            return

        now = time.time()
        total = self._total_bytes()
        elapsed = now - self.last_time
        delta = total - self.last_bytes

        self.last_time = now
        self.last_bytes = total

        if elapsed <= 0:
            return

        devices_with_traffic = set()
        total_traffic_weight = 0.0
        device_traffic = defaultdict(float)

        if traffic_weights:
            for ip, bytes_count in traffic_weights.items():
                mac = self.ip_to_mac.get(ip)
                if mac and mac in active_macs and bytes_count > 0:
                    devices_with_traffic.add(mac)
                    device_traffic[mac] += bytes_count
                    total_traffic_weight += bytes_count

        active_with_traffic = len(devices_with_traffic)
        active_silent = len(active_macs) - active_with_traffic

        if active_with_traffic == 0:
            per_device_bps = (delta / len(active_macs)) / elapsed
            for mac in active_macs:
                self.samples[mac].append((now, per_device_bps))
                cutoff = now - BANDWIDTH_WINDOW
                self.samples[mac] = [(t, b) for t, b in self.samples[mac] if t >= cutoff]
        else:
            traffic_pool = (delta * 0.8) / elapsed
            silent_pool = (delta * 0.2) / elapsed
            per_silent_bps = silent_pool / active_silent if active_silent > 0 else 0

            for mac in active_macs:
                if mac in devices_with_traffic and total_traffic_weight > 0:
                    weighted_bps = (traffic_pool * device_traffic[mac] / total_traffic_weight) if total_traffic_weight > 0 else 0
                    self.samples[mac].append((now, weighted_bps))
                else:
                    self.samples[mac].append((now, per_silent_bps))

                cutoff = now - BANDWIDTH_WINDOW
                self.samples[mac] = [(t, b) for t, b in self.samples[mac] if t >= cutoff]

    def get_bps(self, mac: str) -> float:
        """Get current bandwidth for a MAC (uses EMA if available, else average of samples)."""
        # Prefer EMA (smoothed recent data)
        if mac in self.ema_bandwidth and self.ema_bandwidth[mac] > 0:
            return self.ema_bandwidth[mac]
        
        # Fallback to average of samples
        samples = self.samples.get(mac, [])
        if not samples:
            return 0.0
        return sum(b for _, b in samples) / len(samples)
    
    def has_observed_data(self, mac: str) -> bool:
        """Check if this MAC has real packet sniffer data (vs estimated/fallback)."""
        return mac in self.has_sniffer_data

    def record_scan_stats(self, known_devices: dict):
        """
        After each scan, record average bandwidth per device to persistent storage.
        known_devices: {mac: {ip, hostname, device_type, ...}}
        """
        now = datetime.now().isoformat()
        
        for mac in known_devices:
            bps = self.get_bps(mac)
            if bps > 0:  # Only record if there's actual traffic
                if mac not in self.persistent_data:
                    self.persistent_data[mac] = []
                
                self.persistent_data[mac].append({
                    "timestamp": now,
                    "bps": bps,
                    "ip": self.mac_to_ip.get(mac, "Unknown"),
                    "hostname": known_devices.get(mac, {}).get("hostname", "N/A"),
                })
                
                # Keep only last 1000 entries per MAC to avoid bloating file
                if len(self.persistent_data[mac]) > 1000:
                    self.persistent_data[mac] = self.persistent_data[mac][-1000:]
        
        self._save_persistent()


def format_bps(bps: float) -> str:
    if bps >= 1_000_000:
        return f"{bps/1_000_000:.1f} MB/s"
    elif bps >= 1_000:
        return f"{bps/1_000:.1f} KB/s"
    else:
        return f"{bps:.0f} B/s"


# ── Speed estimation ──────────────────────────────────────────────────────────

def get_device_speed(ip: str) -> int:
    """Estimate device speed in MB/s based on ping latency."""
    try:
        # Ping the device and measure latency
        if platform.system() == 'Windows':
            cmd = ['ping', '-n', '1', '-w', '1000', ip]
        else:
            cmd = ['ping', '-c', '1', '-W', '1', ip]
        
        start_time = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=2)
        end_time = time.time()
        
        if result.returncode == 0:
            # Extract latency from output (simple parsing)
            output = result.stdout
            if 'time=' in output:
                time_str = output.split('time=')[1].split('ms')[0].strip()
                latency = float(time_str)
                # Estimate speed: lower latency = higher speed
                # Rough formula: speed = 1000 / latency (capped at 1000 MB/s)
                speed = min(1000, int(1000 / max(latency, 1)))
                return speed
            elif 'time<' in output:  # Windows format
                time_str = output.split('time<')[1].split('ms')[0].strip()
                latency = float(time_str) if time_str.replace('.', '').isdigit() else 1
                speed = min(1000, int(1000 / max(latency, 1)))
                return speed
        return 0  # No response
    except Exception:
        return 0


# ── Single scan function for API ──────────────────────────────────────────────

def run_scan() -> dict:
    """Perform a single network scan and return structured data for the API."""
    # Check if running with admin privileges for packet sniffing
    has_admin = is_admin()

    local_ip = get_local_ip()
    gateway = get_default_gateway()
    subnet = guess_subnet(local_ip) if local_ip else None

    result = {
        'timestamp': datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
        'local_ip': local_ip,
        'gateway': gateway,
        'subnet': subnet,
        'devices': [],
        'summary': {},
        'alerts': [],
    }

    if not local_ip or not subnet:
        result['summary'] = {
            'activeDevices': 0,
            'averageBandwidth': 0,
            'threatsBlocked': 0,
            'anomalies': 0,
        }
        result['alerts'] = [
            {
                'id': 'scan-001',
                'title': 'Unable to determine local IP',
                'description': 'Please verify your network connection and run as administrator if needed.',
                'device': 'Local Host',
                'ip': 'N/A',
                'time': 'now',
                'severity': 'warning',
            }
        ]
        return result

    raw_devices = arp_scan(subnet)
    sniffer = PacketSniffer()
    tracker = BandwidthTracker(local_ip=local_ip)
    detector = AnomalyDetector(sniffer)

    ip_to_mac_map = {ip: mac for ip, mac in raw_devices.items()}
    mac_to_ip_map = {mac: ip for ip, mac in raw_devices.items()}
    tracker.set_ip_mac_mapping(ip_to_mac_map, mac_to_ip_map)
    sniffer.set_known_ips(set(raw_devices.keys()))

    # Only perform packet sniffing if running with admin privileges
    if raw_devices and has_admin:
        try:
            sniff(prn=sniffer.packet_callback, store=False, timeout=SCAN_INTERVAL)
        except Exception as e:
            print(f"[!] Packet sniffing failed (admin privileges required): {e}")
            # Add warning about limited functionality
            result['alerts'].append({
                'id': 'scan-002',
                'title': 'Limited scanning capabilities',
                'description': 'Packet sniffing requires administrator privileges. Bandwidth and traffic analysis disabled.',
                'device': 'Local Host',
                'ip': local_ip or 'N/A',
                'time': 'now',
                'severity': 'info',
            })

    ip_bps = sniffer.compute_ip_bps()
    protocol_counts, port_counts, _ = sniffer.collect_interval_stats()
    traffic_weights = sniffer.get_recent_ip_weights()

    tracker.ingest_packet_sniffer_bps(ip_bps)
    tracker.update(list(raw_devices.values()), traffic_weights=traffic_weights)

    for ip, mac in raw_devices.items():
        bps = tracker.get_bps(mac)
        speed_mbs = int(round(bps / 1_000_000)) if bps > 0 else 0
        speed_text = format_bps(bps) if bps > 0 else '0 B/s'

        device_record = {
            'ip': ip,
            'mac': mac,
            'hostname': get_hostname(ip),
            'device_type': get_device_type(mac),
            'first_seen': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'speedMBs': speed_mbs,
            'speedBps': int(round(bps)),
            'speedText': speed_text,
        }
        result['devices'].append(device_record)

    active_devices = len(result['devices'])
    average_bandwidth = 0
    if active_devices > 0:
        average_bandwidth = int(round(
            sum(tracker.get_bps(device['mac']) for device in result['devices']) / active_devices / 1_000_000
        ))

    result['summary'] = {
        'activeDevices': active_devices,
        'averageBandwidth': average_bandwidth,
        'threatsBlocked': 0,
        'anomalies': 0,
    }

    display = {device['ip']: {'mac': device['mac'], **device} for device in result['devices']}
    known_devices = {device['mac']: device for device in result['devices']}
    alerts = detector.check_anomalies(
        display,
        tracker,
        set(),
        known_devices,
        ip_bps=ip_bps,
        protocol_counts=protocol_counts,
        port_counts=port_counts,
        local_ip=local_ip,
    )

    result['alerts'] = [
        {
            'id': f'alert-{i+1}',
            'title': alert.get('type', 'Unknown').replace('_', ' ').title(),
            'description': alert.get('message', ''),
            'device': alert.get('mac', 'Unknown'),
            'ip': next((ip for ip, info in display.items() if info['mac'] == alert.get('mac')), 'N/A'),
            'time': 'now',
            'severity': alert.get('severity', 'info').lower(),
        }
        for i, alert in enumerate(alerts)
    ]

    result['summary']['anomalies'] = len(result['alerts'])

    if active_devices == 0:
        result['alerts'].append({
            'id': 'scan-002',
            'title': 'No devices found',
            'description': 'The scanner did not detect any devices on the subnet.',
            'device': 'Network',
            'ip': subnet,
            'time': 'now',
            'severity': 'info',
        })

    return result


# ── Display functions ─────────────────────────────────────────────────────────

def is_admin():
    """Check if running as administrator."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False


def clear():
    """Clear the console screen."""
    if platform.system() == "Windows":
        os.system('cls')
    else:
        os.system('clear')


def print_header(subnet: str, local_ip: str, gateway: str, scan_count: int):
    """Print the header with scan information."""
    print("┌" + "─" * 78 + "┐")
    print(f"│ LabNet Guardian v2.0 - Continuous Network Scanner{' ' * 25}│")
    print("├" + "─" * 78 + "┤")
    print(f"│ Subnet: {subnet:<15} Local IP: {local_ip:<15} Gateway: {gateway:<15} │")
    print(f"│ Scan #{scan_count:<5} {' ' * 60}│")
    print("├" + "─" * 78 + "┤")


def print_devices(display: dict, local_ip: str, gateway: str, tracker, new_macs: set, gone_macs: set, ip_bps: dict = None):
    """Print the device table."""
    print("│ Devices:" + " " * 69 + "│")
    print("├" + "─" * 78 + "┤")
    print("│ IP Address      │ MAC Address       │ Hostname          │ Type          │ Speed   │ BW       │")
    print("├" + "─" * 78 + "┤")
    
    for ip, info in sorted(display.items()):
        mac = info["mac"]
        hostname = info.get("hostname", "N/A")[:16]
        device_type = info.get("device_type", "Unknown")[:13]
        
        # Mark special devices
        marker = ""
        if ip == local_ip:
            marker = "← YOU"
        elif ip == gateway:
            marker = "← GW"
        elif mac in new_macs:
            marker = "← NEW"
        elif mac in gone_macs:
            marker = "← GONE"
        
        # Get bandwidth
        bps = ip_bps.get(ip, 0.0) if ip_bps else tracker.get_bps(mac)
        bw_str = format_bps(bps) if bps > 0 else "N/A"
        
        # Get speed
        speed = info.get("speedMBs", 0)
        speed_str = f"{speed} MB/s" if speed > 0 else "N/A"
        
        print(f"│ {ip:<15} │ {mac:<17} │ {hostname:<16} │ {device_type:<13} │ {speed_str:<7} │ {bw_str:<7} │ {marker}")
    
    print("├" + "─" * 78 + "┤")


def print_bandwidth_stats(tracker):
    """Print bandwidth statistics."""
    print("│ Bandwidth Stats:" + " " * 61 + "│")
    print("├" + "─" * 78 + "┤")
    
    total_bps = 0
    device_count = 0
    
    for mac in tracker.mac_to_ip:
        bps = tracker.get_bps(mac)
        if bps > 0:
            total_bps += bps
            device_count += 1
    
    avg_bps = total_bps / device_count if device_count > 0 else 0
    
    print(f"│ Total Network BW: {format_bps(total_bps):<10} │ Devices: {device_count:<3} │ Avg per device: {format_bps(avg_bps):<10} │")
    print("├" + "─" * 78 + "┤")


def print_anomaly_alerts(alerts: list):
    """Print current anomaly alerts."""
    if not alerts:
        print("│ Alerts: None" + " " * 65 + "│")
    else:
        print("│ Alerts:" + " " * 70 + "│")
        for alert in alerts[-5:]:  # Show last 5 alerts
            severity = alert.get('severity', 'info').upper()
            title = alert.get('type', 'Unknown').replace('_', ' ')
            mac = alert.get('mac', 'Unknown')[:17]
            print(f"│ [{severity}] {title:<15} │ {mac:<17} │")
    
    print("├" + "─" * 78 + "┤")


def print_event_log(event_log: list):
    """Print recent events."""
    print("│ Recent Events:" + " " * 63 + "│")
    print("├" + "─" * 78 + "┤")
    
    for event in event_log[-8:]:  # Show last 8 events
        # Truncate if too long
        if len(event) > 76:
            event = event[:73] + "..."
        print(f"│ {event:<76} │")
    
    print("└" + "─" * 78 + "┘")


# ── Main loop ─────────────────────────────────────────────────────────────────

def main():
    # Check for admin privileges
    if not is_admin():
        print("\n" + "="*80)
        print("  [!] WARNING: LabNet Guardian requires administrator privileges.")
        print("  [!] Some features (ARP scanning, packet sniffing) may fail.")
        print("  [!] Please run as Administrator for full functionality.")
        print("="*80 + "\n")
        response = input("  Continue anyway? (y/n): ").strip().lower()
        if response != 'y':
            print("  [+] Exiting.\n")
            return

    local_ip = get_local_ip()
    if not local_ip:
        print("[-] Could not determine local IP.")
        return

    gateway = get_default_gateway()
    subnet  = guess_subnet(local_ip)
    tracker = BandwidthTracker(local_ip=local_ip)
    sniffer = PacketSniffer()
    detector = AnomalyDetector(sniffer)  # ← Pass sniffer to detector

    known_devices = {}   # mac -> {ip, hostname, device_type, first_seen}
    event_log     = []
    all_alerts    = []   # ← Track all alerts for display
    scan_count    = 0

    # Start packet sniffer in background thread
    print(f"\n  Starting packet sniffer...")
    def run_sniffer():
        try:
            sniff(prn=sniffer.packet_callback, store=False)
        except Exception as e:
            print(f"\n[!] Sniffer failed to start (usually due to missing npcap/winpcap): {e}")
            print("[!] Bandwidth tracking will use fallback estimation.")

    sniffer_thread = threading.Thread(
        target=run_sniffer,
        daemon=True
    )
    sniffer_thread.start()
    time.sleep(0.5)  # Give sniffer time to start

    print(f"  Starting live scan on {subnet} — press Ctrl+C to stop\n")
    time.sleep(1)

    try:
        while True:
            scan_count += 1
            raw = arp_scan(subnet)   # {ip: mac}

            if not raw and known_devices:
                # If arp_scan totally fails, do not assume the network vanished!
                # Keep the current devices so the UI and WebSockets don't flash empty.
                current_macs = set(known_devices.keys())
            else:
                current_macs = set(raw.values())

            previous_macs = set(known_devices.keys())
            new_macs      = current_macs - previous_macs
            gone_macs     = previous_macs - current_macs

            # Enrich newly discovered devices
            for ip, mac in raw.items():
                if mac not in known_devices:
                    hostname = get_hostname(ip)
                    device_type = get_device_type(mac)
                    known_devices[mac] = {
                        "ip":         ip,
                        "hostname":   hostname,
                        "device_type": device_type,
                        "first_seen": datetime.now().strftime("%H:%M:%S"),
                        "missed_scans": 0,
                    }
                    event_log.append(
                        f"[{datetime.now().strftime('%H:%M:%S')}] "
                        f"JOINED  {ip:<16} {mac}  {device_type}"
                    )
                else:
                    known_devices[mac]["ip"] = ip   # update if DHCP changed it
                    known_devices[mac]["missed_scans"] = 0

            # Handle devices that left
            actually_gone_macs = set()
            for mac in gone_macs:
                known_devices[mac]["missed_scans"] = known_devices[mac].get("missed_scans", 0) + 1
                if known_devices[mac]["missed_scans"] > 6:
                    actually_gone_macs.add(mac)

            for mac in actually_gone_macs:
                info = known_devices.pop(mac)
                event_log.append(
                    f"[{datetime.now().strftime('%H:%M:%S')}] "
                    f"LEFT    {info['ip']:<16} {mac}  {info['device_type']}"
                )

            # Compute per-IP bandwidth from packet sniffer (more accurate than equal split)
            ip_bps = sniffer.compute_ip_bps()

            # Build display dict keyed by IP
            display = {
                info["ip"]: {"mac": mac, **info}
                for mac, info in known_devices.items()
            }

            sniffer.set_known_ips(set(raw.keys()))

            protocol_counts, port_counts, flow_counts = sniffer.collect_interval_stats()
            traffic_weights = sniffer.get_recent_ip_weights()

            ip_to_mac_map = {ip: info["mac"] for ip, info in display.items()}
            mac_to_ip_map = {info["mac"]: ip for ip, info in display.items()}
            tracker.set_ip_mac_mapping(ip_to_mac_map, mac_to_ip_map)

            tracker.update(list(current_macs), traffic_weights=traffic_weights)
            if ip_bps:
                tracker.ingest_packet_sniffer_bps(ip_bps)

            current_alerts = detector.check_anomalies(
                display,
                tracker,
                new_macs,
                known_devices,
                ip_bps=ip_bps,
                protocol_counts=protocol_counts,
                port_counts=port_counts,
                local_ip=local_ip,
            )

            # Record bandwidth stats to persistent storage
            tracker.record_scan_stats(known_devices)
            all_alerts.extend(current_alerts)
            # Keep only last 20 alerts for display
            all_alerts = all_alerts[-20:]

            clear()
            print_header(subnet, local_ip, gateway, scan_count)
            print_devices(display, local_ip, gateway, tracker, new_macs, gone_macs, ip_bps=ip_bps)
            print_bandwidth_stats(tracker)
            print_anomaly_alerts(current_alerts)  # ← Display new alerts
            print_event_log(event_log)
            print(f"  Next scan in {SCAN_INTERVAL}s — Ctrl+C to stop")

            if SOCKETIO_AVAILABLE:
                try:
                    if not sio.connected:
                        sio.connect('http://localhost:3000')
                    
                    ws_payload = []
                    for ip, info in display.items():
                        mac = info["mac"]
                        bps = ip_bps.get(ip, 0.0) if ip_bps else tracker.get_bps(mac)
                        status = "offline" if info.get("missed_scans", 0) > 0 else "active"
                        ws_payload.append({
                            "ip": ip,
                            "mac": mac,
                            "hostname": info.get("hostname", "N/A"),
                            "type": info.get("device_type", "Unknown"),
                            "bandwidth": bps,
                            "status": status
                        })
                    
                    sio.emit('scanner_update', ws_payload)
                except Exception as e:
                    # Silently ignore connection errors so the scanner continues working
                    pass

            time.sleep(SCAN_INTERVAL)

    except KeyboardInterrupt:
        print("\n\n  [+] Scan stopped. Goodbye.\n")


if __name__ == "__main__":
    main()

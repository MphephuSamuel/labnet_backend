import path from "path";
import { spawn, ChildProcess } from "child_process";

const SCANNER_HOST = process.env.SCANNER_HOST || "127.0.0.1";
const SCANNER_PORT = Number(process.env.SCANNER_PORT || 5001);
export const SCANNER_URL = `http://${SCANNER_HOST}:${SCANNER_PORT}`;

let scannerProcess: ChildProcess | null = null;

const getScannerDir = () => path.resolve(process.cwd(), "scanner");

const getPythonCommand = () => process.env.PYTHON_PATH || "python";

export const startScannerService = () => {
  if (scannerProcess) {
    return;
  }

  const scannerDir = getScannerDir();
  const scriptPath = path.join(scannerDir, "scan_network_api.py");
  const python = getPythonCommand();

  scannerProcess = spawn(python, [scriptPath, "--port", `${SCANNER_PORT}`], {
    cwd: scannerDir,
    stdio: ["ignore", "pipe", "pipe"],
  });

  scannerProcess.stdout?.on("data", (data) => {
    process.stdout.write(`[scanner] ${data}`);
  });

  scannerProcess.stderr?.on("data", (data) => {
    process.stderr.write(`[scanner] ${data}`);
  });

  scannerProcess.on("exit", (code, signal) => {
    console.warn(`Scanner subprocess exited with code=${code} signal=${signal}`);
    scannerProcess = null;
  });
};

const fetchScannerApi = async <T>(route: string): Promise<T> => {
  const url = `${SCANNER_URL}${route}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Scanner API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
};

export const getScannerDevices = () => fetchScannerApi<any>("/api/devices");
export const getScannerSummary = () => fetchScannerApi<any>("/api/summary");
export const getScannerAlerts = () => fetchScannerApi<any>("/api/alerts");
export const getScannerStatus = () => fetchScannerApi<any>("/api/status");
export const getScannerHistory = (query = "") =>
  fetchScannerApi<any>(`/api/history${query ? `?q=${encodeURIComponent(query)}` : ""}`);

export const waitForScannerReady = async (retries = 12, delayMs = 500) => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await getScannerStatus();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  console.warn("Scanner service did not become ready within expected time.");
};

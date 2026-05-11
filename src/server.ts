import "dotenv/config";
import app from "./app";
import { startScannerService, waitForScannerReady } from "./services/scanner.service";

const PORT = Number(process.env.PORT || 5000);

startScannerService();

waitForScannerReady().finally(() => {
  app.listen(PORT, () => {
    console.log(`LabNet Backend running on port ${PORT}`);
    console.log(`Scanner proxy endpoints available at http://localhost:${PORT}/api/{devices,summary,alerts,status,history}`);
  });
});

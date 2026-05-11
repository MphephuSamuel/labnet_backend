import "dotenv/config";
import app from "./app";
// import { startScannerService, waitForScannerReady } from "./services/scanner.service";

const PORT = Number(process.env.PORT || 5000);

console.log("🚀 Starting LabNet Backend...");
console.log(`📡 Port: ${PORT}`);

// startScannerService();
// console.log("🔍 Scanner service started");

// Try to wait for scanner but don't block server startup
// waitForScannerReady().then(() => {
//   console.log("✅ Scanner service is ready");
// }).catch((error) => {
//   console.warn("⚠️ Scanner service failed to start:", error.message);
//   console.warn("🚀 Server will start without scanner functionality");
// }).finally(() => {
  console.log("🌐 Starting Express server...");
  app.listen(PORT, () => {
    console.log(`✅ LabNet Backend running on port ${PORT}`);
    console.log(`🔗 Scanner proxy endpoints available at http://localhost:${PORT}/api/{devices,summary,alerts,status,history}`);
    console.log(`🏠 Health check: http://localhost:${PORT}/test`);
  });
// });

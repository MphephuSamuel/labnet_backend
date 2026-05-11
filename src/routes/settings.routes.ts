import express from 'express';
console.log('Loading settings.routes.ts');
import {
  updateAnomalyDetection,
  getAnomalyDetection,
  updateDetectionSensitivity,
  getDetectionSensitivity,
  updateAutoBlockThreats,
  getAutoBlockThreats,
  getWhitelist,
  addIpRange,
  removeIpRange,
} from '../controllers/settings.controller';

const router = express.Router();

console.log('Registering PUT /anomaly-detection');
// Toggle anomaly detection
router.put('/anomaly-detection', (req, res) => {
  console.log('PUT /anomaly-detection called');
  updateAnomalyDetection(req, res);
});

console.log('Registering GET /anomaly-detection');
// Get anomaly detection status
router.get('/anomaly-detection', (req, res) => {
  console.log('GET /anomaly-detection called');
  getAnomalyDetection(req, res);
});

router.put(
  '/detection-sensitivity',
  updateDetectionSensitivity
);

router.get(
  '/detection-sensitivity',
  getDetectionSensitivity
);

router.put(
  '/auto-block-threats',
  updateAutoBlockThreats
);

router.get(
  '/auto-block-threats',
  getAutoBlockThreats
);

router.get('/whitelist', getWhitelist);

router.put('/whitelist/ip-ranges', addIpRange);

router.delete('/whitelist/ip-ranges', removeIpRange);

export default router;

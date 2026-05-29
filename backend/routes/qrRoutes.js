const express = require("express");
const { scanQR, validateProduct } = require("../controllers/qrController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/scan", authenticate, scanQR);
router.get("/validate/:code", authenticate, validateProduct);

module.exports = router;

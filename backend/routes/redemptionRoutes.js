const express = require("express");
const { listRedemptions, createRedemption } = require("../controllers/redemptionController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/", listRedemptions);
router.post("/", createRedemption);

module.exports = router;

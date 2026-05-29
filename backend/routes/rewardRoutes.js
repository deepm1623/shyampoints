const express = require("express");
const { listRewards, redeemReward } = require("../controllers/rewardController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", listRewards);
router.post("/:rewardId/redeem", authenticate, redeemReward);

module.exports = router;

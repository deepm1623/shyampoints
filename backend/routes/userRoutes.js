const express = require("express");
const { getProfile, updateProfile } = require("../controllers/userController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/me", getProfile);
router.put("/me", updateProfile);

module.exports = router;

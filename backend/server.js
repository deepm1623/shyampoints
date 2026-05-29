const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const qrRoutes = require("./routes/qrRoutes");
const redemptionRoutes = require("./routes/redemptionRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/redemptions", redemptionRoutes);

app.get("/", (req, res) => {
  res.json({ message: "ShyamPoints backend is running." });
});

app.use(errorHandler);

const port = process.env.BACKEND_PORT || 4000;
app.listen(port, () => {
  console.log(`ShyamPoints backend listening on port ${port}`);
});

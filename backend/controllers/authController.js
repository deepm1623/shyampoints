const { verifyToken } = require("../services/firebaseService");

exports.login = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing idToken" });
    const decoded = await verifyToken(idToken);
    res.json({ uid: decoded.uid, email: decoded.email });
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { email, name, phone } = req.body;
    res.json({ message: "Registration endpoint placeholder", email, name, phone });
  } catch (error) {
    next(error);
  }
};

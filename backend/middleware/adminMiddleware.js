exports.requireAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || !user.admin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

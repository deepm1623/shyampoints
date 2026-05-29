exports.scanQR = async (req, res, next) => {
  try {
    const { qrCode } = req.body;
    res.json({ message: "QR scan placeholder", qrCode });
  } catch (error) {
    next(error);
  }
};

exports.validateProduct = async (req, res, next) => {
  try {
    const { code } = req.params;
    res.json({ message: `Validate QR code ${code} placeholder` });
  } catch (error) {
    next(error);
  }
};

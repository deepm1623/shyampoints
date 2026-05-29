const QR_CODE_BASE_URL = "https://example.com/qr";

exports.buildQRCodeUrl = (id) => `${QR_CODE_BASE_URL}/${encodeURIComponent(id)}`;

exports.createQrPayload = ({ id, product, user }) => ({
  id,
  product,
  user,
  createdAt: new Date().toISOString(),
});

const admin = require("firebase-admin");
const { initializeFirebaseAdmin } = require("../config/firebaseAdmin");

initializeFirebaseAdmin();

exports.verifyToken = async (idToken) => {
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded;
};

exports.getUserById = async (uid) => {
  return admin.auth().getUser(uid);
};

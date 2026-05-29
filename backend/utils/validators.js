exports.validateEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

exports.validatePhone = (value) => {
  return /^\+?[0-9]{8,15}$/.test(value);
};

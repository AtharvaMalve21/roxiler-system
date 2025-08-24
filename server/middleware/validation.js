const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const userValidationRules = () => {
  return [
    body('name')
      .isLength({ min: 20, max: 60 })
      .withMessage('Name must be between 20 and 60 characters'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8, max: 16 })
      .withMessage('Password must be between 8 and 16 characters')
      .matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])/)
      .withMessage('Password must contain at least one uppercase letter and one special character'),
    body('address')
      .optional()
      .isLength({ max: 400 })
      .withMessage('Address cannot exceed 400 characters')
  ];
};

const storeValidationRules = () => {
  return [
    body('name')
      .notEmpty()
      .withMessage('Store name is required')
      .isLength({ max: 255 })
      .withMessage('Store name cannot exceed 255 characters'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('address')
      .optional()
      .isLength({ max: 400 })
      .withMessage('Address cannot exceed 400 characters')
  ];
};

const ratingValidationRules = () => {
  return [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be an integer between 1 and 5'),
    body('storeId')
      .isInt({ min: 1 })
      .withMessage('Valid store ID is required')
  ];
};

const passwordUpdateRules = () => {
  return [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8, max: 16 })
      .withMessage('New password must be between 8 and 16 characters')
      .matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])/)
      .withMessage('New password must contain at least one uppercase letter and one special character')
  ];
};

module.exports = {
  handleValidationErrors,
  userValidationRules,
  storeValidationRules,
  ratingValidationRules,
  passwordUpdateRules
};
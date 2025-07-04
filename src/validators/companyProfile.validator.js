import { body, param } from 'express-validator';

export const validateCreateCompanyProfile = [
  body('company_name')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ max: 150 }).withMessage('Company name must not exceed 150 characters'),

  body('website_link')
    .optional({ checkFalsy: true })
    .trim()
    .isURL().withMessage('Invalid website URL'),

  body('established')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('Established field must not exceed 30 characters'),

  body('address')
    .trim()
    .notEmpty().withMessage('Address is required'),

  body('button_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Button name must not exceed 50 characters'),

  body('button_redirect_url')
    .optional({ checkFalsy: true })
    .trim()
    .isURL().withMessage('Invalid redirect URL'),
];

export const validateUpdateCompanyProfile = [
  param('id')
    .isMongoId().withMessage('Invalid company profile ID'),

  body('company_name')
    .optional()
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ max: 150 }).withMessage('Company name must not exceed 150 characters'),

  body('website_link')
    .optional({ checkFalsy: true })
    .trim()
    .isURL().withMessage('Invalid website URL'),

  body('established')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('Established field must not exceed 30 characters'),

  body('address')
    .optional()
    .trim()
    .notEmpty().withMessage('Address is required'),

  body('button_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Button name must not exceed 50 characters'),

  body('button_redirect_url')
    .optional({ checkFalsy: true })
    .trim()
    .isURL().withMessage('Invalid redirect URL'),
];


export const validateCompanyProfileId = [
  param('id')
    .isMongoId().withMessage('Invalid company profile ID'),
];

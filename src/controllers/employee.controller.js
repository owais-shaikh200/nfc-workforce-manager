import Employee from '../models/employee.model.js';
import Department from '../models/department.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import applyQueryOptions from '../utils/queryHelper.js';
import HTTP_STATUS from '../constants/httpStatus.js';

// Create employee
export const createEmployee = asyncWrapper(async (req, res, next) => {
  const {
    name,
    email,
    phone_number,
    age,
    joining_date,
    designation,
    department_id,
    about_me,
    address,
    facebook,
    twitter,
    instagram,
    youtube,
  } = req.body;

  if (!req.file) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Profile image is required'));
  }

  const normalizedEmail = email.toLowerCase();

  const existingEmail = await Employee.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email already exists'));
  }

  const department = await Department.findById(department_id);
  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  const image = await uploadToCloudinary(req.file.buffer, 'employee_profiles');

  const employee = await Employee.create({
    name,
    email: normalizedEmail,
    phone_number,
    age,
    joining_date,
    designation,
    department_id,
    about_me,
    address,
    social_links: {
      facebook: facebook || '',
      twitter: twitter || '',
      instagram: instagram || '',
      youtube: youtube || '',
    },
    profile_image: {
      public_id: image.public_id,
      url: image.secure_url,
    },
  });

  res.status(HTTP_STATUS.CREATED).json({ success: true, employee });
});

// Get all employees (with pagination/search/sort)
export const getEmployees = asyncWrapper(async (req, res) => {
  const baseQuery = Employee.find();

  const { results: employees, pagination } = await applyQueryOptions(
    Employee,
    baseQuery,
    req.query,
    ['name', 'email', 'phone_number', 'designation'],
    ['name', 'email', 'created_at']
  );

  if (employees.length === 0) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'No employees found',
      employees: [],
      pagination,
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    employees,
    pagination,
  });
});

// Get single employee by ID
export const getEmployeeById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const employee = await Employee.findById(id).populate('department_id', 'name email');

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    employee,
  });
});

// Update employee
export const updateEmployee = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const {
    email,
    department_id,
    facebook,
    twitter,
    instagram,
    youtube,
  } = req.body;

  const employee = await Employee.findById(id);
  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  const newEmail = email?.toLowerCase() || employee.email;
  const newDeptId = department_id || employee.department_id.toString();

  const socialUnchanged =
    (employee.social_links.facebook || '') === (facebook || '') &&
    (employee.social_links.twitter || '') === (twitter || '') &&
    (employee.social_links.instagram || '') === (instagram || '') &&
    (employee.social_links.youtube || '') === (youtube || '');

  const isSameEmail = newEmail === employee.email;
  const isSameDept = newDeptId === employee.department_id.toString();
  const isSameImage = req.file
    ? false
    : true;

  const otherFieldsUnchanged = Object.entries(req.body).every(([key, value]) => {
    if (['email', 'facebook', 'twitter', 'instagram', 'youtube'].includes(key)) return true;
    return employee[key]?.toString() === value?.toString();
  });

  if (isSameEmail && isSameDept && isSameImage && socialUnchanged && otherFieldsUnchanged) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Employee updated successfully',
      employee,
    });
  }

  // Check for duplicate email and assign only if changed
  if (email && email.toLowerCase() !== employee.email.toLowerCase()) {
    const duplicateEmail = await Employee.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
    if (duplicateEmail) {
      return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email already exists'));
    }
    employee.email = email.toLowerCase();
  }

  // Check if new department is valid
  if (department_id && department_id !== employee.department_id.toString()) {
    const department = await Department.findById(department_id);
    if (!department) {
      return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
    }
  }

  // Update other fields (excluding email and social links)
  Object.entries(req.body).forEach(([key, value]) => {
    if (
      value !== undefined &&
      !['email', 'facebook', 'twitter', 'instagram', 'youtube'].includes(key)
    ) {
      employee[key] = value;
    }
  });

  // Update social links
  employee.social_links.facebook = facebook || '';
  employee.social_links.twitter = twitter || '';
  employee.social_links.instagram = instagram || '';
  employee.social_links.youtube = youtube || '';

  // Update profile image if provided
  if (req.file) {
    await deleteFromCloudinary(employee.profile_image.public_id);
    const newImage = await uploadToCloudinary(req.file.buffer, 'employee_profiles');
    employee.profile_image = {
      public_id: newImage.public_id,
      url: newImage.secure_url,
    };
  }

  await employee.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee updated successfully',
    employee,
  });
});



// Delete employee
export const deleteEmployee = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const employee = await Employee.findById(id);
  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  await deleteFromCloudinary(employee.profile_image.public_id);
  await employee.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee deleted successfully',
  });
});

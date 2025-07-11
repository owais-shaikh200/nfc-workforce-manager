import CompanyProfile from '../models/companyProfile.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Uploader.js';
import { generatePresignedUrl } from '../utils/s3.js';

export const createCompanyProfile = asyncWrapper(async (req, res, next) => {
  const { company_name, website_link, established, address, button_name, button_redirect_url } =
    req.body;

  const profileImage = req.file;

  if (!profileImage) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Profile image is required'));
  }

  const existingProfile = await CompanyProfile.findOne();
  if (existingProfile) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Company profile already exists'));
  }

  const uploadResult = await uploadToS3(
    profileImage.buffer,
    profileImage.originalname,
    profileImage.mimetype
  );

  const companyProfile = await CompanyProfile.create({
    company_name,
    website_link,
    established,
    address,
    button_name,
    button_redirect_url,
    image_url: uploadResult?.url || null,
    image_key: uploadResult?.key || null,
  });

  if (companyProfile.image_key) {
    companyProfile.image_url = await generatePresignedUrl(companyProfile.image_key);
  }

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Company profile created successfully',
    company_profile: companyProfile,
  });
});

export const getCompanyProfile = asyncWrapper(async (req, res, next) => {
  const companyProfile = await CompanyProfile.findOne();

  if (!companyProfile) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Company profile not found'));
  }

  if (companyProfile.image_key) {
    companyProfile.image_url = await generatePresignedUrl(companyProfile.image_key);
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    company_profile: companyProfile,
  });
});

export const updateCompanyProfile = asyncWrapper(async (req, res, next) => {
  const { company_name, website_link, established, address, button_name, button_redirect_url } =
    req.body;

  const { id } = req.params;
  const profileImage = req.file;

  const companyProfile = await CompanyProfile.findById(id);
  if (!companyProfile) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Company profile not found'));
  }

  const trimmedName = company_name?.trim();
  const trimmedWebsite = website_link?.trim();
  const trimmedEstablished = established?.trim();
  const trimmedAddress = address?.trim();
  const trimmedButtonName = button_name?.trim();
  const trimmedButtonUrl = button_redirect_url?.trim();

  const isSameName = trimmedName === companyProfile.company_name;
  const isSameWebsite = trimmedWebsite === companyProfile.website_link;
  const isSameEstablished = trimmedEstablished === companyProfile.established;
  const isSameAddress = trimmedAddress === companyProfile.address;
  const isSameButtonName = trimmedButtonName === companyProfile.button_name;
  const isSameButtonUrl = trimmedButtonUrl === companyProfile.button_redirect_url;
  const isSameImage = !profileImage;

  if (
    (trimmedName ? isSameName : true) &&
    (trimmedWebsite ? isSameWebsite : true) &&
    (trimmedEstablished ? isSameEstablished : true) &&
    (trimmedAddress ? isSameAddress : true) &&
    (trimmedButtonName ? isSameButtonName : true) &&
    (trimmedButtonUrl ? isSameButtonUrl : true) &&
    isSameImage
  ) {
    if (companyProfile.image_key) {
      companyProfile.image_url = await generatePresignedUrl(companyProfile.image_key);
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Nothing to update',
      company_profile: companyProfile,
    });
  }

  if (profileImage) {
    if (companyProfile.image_key) {
      await deleteFromS3(companyProfile.image_key);
    }

    const uploadResult = await uploadToS3(
      profileImage.buffer,
      profileImage.originalname,
      profileImage.mimetype
    );

    companyProfile.image_url = uploadResult?.url || companyProfile.image_url;
    companyProfile.image_key = uploadResult?.key || companyProfile.image_key;
  }

  if (trimmedName && !isSameName) companyProfile.company_name = trimmedName;
  if (trimmedWebsite && !isSameWebsite) companyProfile.website_link = trimmedWebsite;
  if (trimmedEstablished && !isSameEstablished) companyProfile.established = trimmedEstablished;
  if (trimmedAddress && !isSameAddress) companyProfile.address = trimmedAddress;
  if (trimmedButtonName && !isSameButtonName) companyProfile.button_name = trimmedButtonName;
  if (trimmedButtonUrl && !isSameButtonUrl) companyProfile.button_redirect_url = trimmedButtonUrl;

  await companyProfile.save();

  if (companyProfile.image_key) {
    companyProfile.image_url = await generatePresignedUrl(companyProfile.image_key);
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Company profile updated successfully',
    company_profile: companyProfile,
  });
});

export const deleteCompanyProfile = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const companyProfile = await CompanyProfile.findById(id);
  if (!companyProfile) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Company profile not found'));
  }

  if (companyProfile.image_key) {
    await deleteFromS3(companyProfile.image_key);
  }

  await companyProfile.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Company profile deleted successfully',
  });
});

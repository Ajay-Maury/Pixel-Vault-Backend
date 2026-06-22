import imageModel from '../models/imageModel.js';
import { v2 as cloudinary } from 'cloudinary';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';
import logger from '../utils/logger.js';

const MAX_IMAGE_COUNT = 40;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_BULK_IMAGE_ACTION_COUNT = 100;

const imageController = {

  async saveImage(req, res) {
    const { title, description, keywords, height, width, imageUrl, imageUrls, size, isPrivate } = req.body;

    if (!title) {
      throw badRequest('title is required');
    }

    const imagePayloads = normalizeImagePayloads({
      imageUrl,
      imageUrls,
      height,
      width,
      size,
      title
    });

    if (!imagePayloads.length) {
      throw badRequest('imageUrl or imageUrls is required');
    }

    if (imagePayloads.length > MAX_IMAGE_COUNT) {
      throw badRequest(`You can save a maximum of ${MAX_IMAGE_COUNT} images`);
    }

    const keywordArray = keywords
      ? keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const savedImages = await Promise.all(imagePayloads.map((item) => {
      if (!item.imageUrl) {
        throw badRequest('Each image entry must include imageUrl');
      }

      if (item.size != null && Number(item.size) > MAX_IMAGE_SIZE_BYTES) {
        throw badRequest('Each image must be 5 MB or smaller');
      }

      return imageModel.createImage({
        users: {
          connect: { id: req.user.id }
        },
        title: item.title ?? title,
        description,
        image_url: item.imageUrl,
        keywords: keywordArray,
        height: item.height ?? height,
        width: item.width ?? width,
        size: item.size ?? size,
        is_private: isPrivate ?? true
      });
    }));

    logger.info('Image metadata saved', {
      userId: req.user.id,
      imageCount: savedImages.length,
      title
    });

    if (savedImages.length === 1) {
      return res.status(201).json({
        image: savedImages[0],
        images: savedImages
      });
    }

    return res.status(201).json({ images: savedImages });
  },


  async searchImages(req, res) {
    const { searchText = '', limit = 12, offset = 0, myLibrary = false } = req.body;

    const userId = req.user.id;
    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);

    if (Number.isNaN(parsedLimit) || Number.isNaN(parsedOffset)) {
      throw badRequest('limit and offset must be numbers');
    }

    const images = await imageModel.findImagesForUser(
      userId,
      searchText,
      parsedLimit,
      parsedOffset,
      myLibrary
    );

    const counts = await imageModel.getImageCountsForUser(
      userId,
      searchText,
      myLibrary
    );

    logger.info('Image search executed', {
      userId,
      searchText,
      limit: parsedLimit,
      offset: parsedOffset,
      myLibrary,
      resultCount: images.length
    });

    res.json({
      data: images,
      totalCount: counts.totalCount,
      privateCount: counts.privateCount,
      publicCount: counts.publicCount
    });
  },


  async deleteImage(req, res) {
    const { id } = req.params;

    const image = await imageModel.findById(id);

    if (!image) {
      throw notFound('Image not found');
    }

    if (String(image.user_id) !== String(req.user.id)) {
      throw forbidden('Forbidden');
    }

    await deleteCloudinaryAssets([image], req.user.id);
    await imageModel.deleteImage(id);

    logger.info('Image deleted', {
      imageId: id,
      userId: req.user.id
    });
    res.status(204).send();
  },


  async bulkUpdatePrivacy(req, res) {
    const { imageIds, isPrivate } = req.body;
    const normalizedImageIds = validateBulkImageIds(imageIds);

    if (typeof isPrivate !== 'boolean') {
      throw badRequest('isPrivate must be a boolean');
    }

    const images = await imageModel.findByIds(normalizedImageIds);
    ensureOwnedImages(images, normalizedImageIds, req.user.id);

    await imageModel.updateImages(normalizedImageIds, {
      is_private: isPrivate
    });

    logger.info('Bulk image privacy updated', {
      userId: req.user.id,
      imageCount: normalizedImageIds.length,
      isPrivate
    });

    res.json({
      message: 'Image privacy updated successfully',
      updatedCount: normalizedImageIds.length,
      isPrivate
    });
  },


  async bulkDeleteImages(req, res) {
    const { imageIds } = req.body;
    const normalizedImageIds = validateBulkImageIds(imageIds);
    const images = await imageModel.findByIds(normalizedImageIds);

    ensureOwnedImages(images, normalizedImageIds, req.user.id);

    await deleteCloudinaryAssets(images, req.user.id);
    await imageModel.deleteImages(normalizedImageIds);

    logger.info('Bulk images deleted', {
      userId: req.user.id,
      imageCount: normalizedImageIds.length
    });

    res.json({
      message: 'Images deleted successfully',
      deletedCount: normalizedImageIds.length
    });
  },


  async updateImage(req, res) {
    const { id } = req.params;
    const { title, description, keywords, isPrivate } = req.body;

    const image = await imageModel.findById(id);

    if (!image) {
      throw notFound('Image not found');
    }

    if (String(image.user_id) !== String(req.user.id)) {
      throw forbidden('Forbidden');
    }

    const keywordArray = keywords
      ? keywords.split(',').map(k => k.trim()).filter(Boolean)
      : image.keywords;

    const updated = await imageModel.updateImage(id, {
      title: title ?? image.title,
      description: description ?? image.description,
      keywords: keywordArray,
      is_private: isPrivate ?? image.is_private
    });

    logger.info('Image updated', {
      imageId: id,
      userId: req.user.id
    });
    res.json({ image: updated });
  }

};


function extractPublicIdFromUrl(url) {
  try {
    const clean = url.split('?')[0];
    const parts = clean.split('/');
    const file = parts.pop();
    const folder = parts.pop();

    return folder && file
      ? `${folder}/${file.split('.')[0]}`
      : null;

  } catch {
    return null;
  }
}

export default imageController;

async function deleteCloudinaryAssets(images, userId) {
  await Promise.all(images.map(async (image) => {
    try {
      const publicId = extractPublicIdFromUrl(image.image_url);

      if (publicId) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image'
        });
      }
    } catch (err) {
      logger.warn('Cloudinary delete failed, continuing with database delete', {
        imageId: image.id,
        userId,
        error: err
      });
    }
  }));
}

function normalizeImagePayloads({ imageUrl, imageUrls, height, width, size, title }) {
  if (Array.isArray(imageUrls)) {
    return imageUrls;
  }

  if (typeof imageUrls === 'string' && imageUrls.trim()) {
    return [{
      imageUrl: imageUrls,
      height,
      width,
      size,
      title
    }];
  }

  if (imageUrl) {
    return [{
      imageUrl,
      height,
      width,
      size,
      title
    }];
  }

  return [];
}

function validateBulkImageIds(imageIds) {
  if (!Array.isArray(imageIds) || !imageIds.length) {
    throw badRequest('imageIds must be a non-empty array');
  }

  if (imageIds.length > MAX_BULK_IMAGE_ACTION_COUNT) {
    throw badRequest(`You can update a maximum of ${MAX_BULK_IMAGE_ACTION_COUNT} images at a time`);
  }

  const normalizedImageIds = [...new Set(imageIds.map((id) => String(id).trim()).filter(Boolean))];

  if (!normalizedImageIds.length) {
    throw badRequest('imageIds must contain valid values');
  }

  return normalizedImageIds;
}

function ensureOwnedImages(images, requestedIds, userId) {
  if (images.length !== requestedIds.length) {
    throw forbidden('One or more images do not belong to you or do not exist');
  }

  const hasUnownedImage = images.some((image) => String(image.user_id) !== String(userId));
  if (hasUnownedImage) {
    throw forbidden('One or more images do not belong to you');
  }
}

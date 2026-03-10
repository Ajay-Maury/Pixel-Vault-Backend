import imageModel from '../models/imageModel.js';
import { v2 as cloudinary } from 'cloudinary';

const imageController = {

  async saveImage(req, res) {
    const { title, description, keywords, height, width, imageUrl, size, isPrivate } = req.body;

    try {
      const keywordArray = keywords
        ? keywords.split(',').map(k => k.trim()).filter(Boolean)
        : [];

      const image = await imageModel.createImage({
        users: {
          connect: { id: req.user.id }
        },
        title,
        description,
        image_url: imageUrl,
        keywords: keywordArray,
        height,
        width,
        size,
        is_private: isPrivate ?? true
      });

      res.status(201).json({ image });

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },


  async searchImages(req, res) {
    const { searchText = '', limit = 12, offset = 0, myLibrary = false } = req.body;

    const userId = req.user.id;

    try {
      const images = await imageModel.findImagesForUser(
        userId,
        searchText,
        Number(limit),
        Number(offset),
        myLibrary
      );

      const totalCount = await imageModel.countImagesForUser(
        userId,
        searchText,
        myLibrary
      );

      res.json({
        data: images,
        totalCount
      });

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },


  async deleteImage(req, res) {
    const { id } = req.params;

    try {
      const image = await imageModel.findById(id);

      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      if (String(image.user_id) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      try {
        const publicId = extractPublicIdFromUrl(image.image_url);

        if (publicId) {
          await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image'
          });
        }
      } catch {}

      await imageModel.deleteImage(id);

      res.status(204).send();

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },


  async updateImage(req, res) {
    const { id } = req.params;
    const { title, description, keywords, isPrivate } = req.body;

    try {
      const image = await imageModel.findById(id);

      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }

      if (String(image.user_id) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
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

      res.json({ image: updated });

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
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
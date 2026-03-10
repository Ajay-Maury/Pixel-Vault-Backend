const imageModel = require('../models/imageModel');
const cloudinary = require('cloudinary').v2;

exports.saveImage = async (req, res) => {
  const { title, description, keywords, height, width, imageUrl, size, isPrivate } = req.body;
  try {
    const keywordArray = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    const image = await imageModel.createImage({
      userId: req.user.id,
      title,
      description,
      imageUrl,
      keywords: keywordArray,
      height,
      width,
      size,
      isPrivate: isPrivate ?? true
    });
    res.status(201).json({ image });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.searchImages = async (req, res) => {
  const { searchText = '', limit = 12, offset = 0 } = req.body;
  const authHeader = req.headers.authorization;
  let userId = null;
  try {
    if (authHeader?.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      userId = decoded.id;
    }
  } catch (err) {}
  try {
    const images = await imageModel.findImagesForUser(userId, searchText, limit, offset);
    const totalCount = await imageModel.countImagesForUser(userId, searchText);
    res.json({ data: images, totalCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteImage = async (req, res) => {
  const { id } = req.params;
  try {
    const image = await imageModel.findById(id);
    if (!image) return res.status(404).json({ message: 'Image not found' });
    if (String(image.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden' });
    try {
      const publicId = extractPublicIdFromUrl(image.imageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      }
    } catch (err) {}
    await imageModel.deleteImage(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateImage = async (req, res) => {
  const { id } = req.params;
  const { title, description, keywords, isPrivate } = req.body;
  try {
    const image = await imageModel.findById(id);
    if (!image) return res.status(404).json({ message: 'Image not found' });
    if (String(image.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden' });
    const keywordArray = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : image.keywords;
    const updated = await imageModel.updateImage(id, {
      title: title ?? image.title,
      description: description ?? image.description,
      keywords: keywordArray,
      isPrivate: isPrivate ?? image.isPrivate,
      uploadedAt: new Date()
    });
    res.json({ image: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

function extractPublicIdFromUrl(url) {
  try {
    const clean = url.split('?')[0];
    const parts = clean.split('/');
    const file = parts.pop();
    const folder = parts.pop();
    return folder && file ? `${folder}/${file.split('.')[0]}` : null;
  } catch {
    return null;
  }
}

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// Upload Attachment
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Tidak ada berkas yang diunggah' });
  }

  const attachment = {
    id: `att-${Date.now()}`,
    name: req.file.originalname,
    storedFilename: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
    url: `/api/files/${req.file.filename}`,
    uploadedAt: new Date().toISOString(),
  };

  res.json({ success: true, data: attachment });
});

// Serve Attachment
router.get('/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, path.basename(filename));

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Berkas tidak ditemukan atau telah dihapus.');
  }

  res.sendFile(filePath);
});

module.exports = router;

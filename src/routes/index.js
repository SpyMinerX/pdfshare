const path = require('path');
const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const { listPDFs, deletePDF, UPLOAD_DIR } = require('../storage');
const { requireAuth } = require('../middleware');
const config = require('../config');
const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, file.originalname),
  }),
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    cb(ok ? null : new Error('Only PDF files are allowed'), ok);
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const files = listPDFs();
    const pdfs = await Promise.all(
      files.map(async (filename) => {
        const viewUrl = `${config.baseUrl}/view/${encodeURIComponent(filename)}`;
        const qrDataUrl = await QRCode.toDataURL(viewUrl, { width: 200, margin: 1 });
        return { filename, viewUrl, qrDataUrl };
      })
    );
    res.render('index', { user: req.user, pdfs, error: req.query.error });
  } catch (err) {
    console.error('Error loading PDFs:', err);
    res.status(500).render('error', { message: 'Could not load PDF list.' });
  }
});

router.post('/upload', requireAuth, upload.single('pdf'), (req, res) => {
  if (!req.file) return res.redirect('/?error=no-file');
  res.redirect('/');
});

router.post('/delete/:filename', requireAuth, (req, res) => {
  try {
    deletePDF(decodeURIComponent(req.params.filename));
  } catch (err) {
    console.error('Delete error:', err.message);
  }
  res.redirect('/');
});

router.get('/view/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const pdfUrl = `/pdf/${encodeURIComponent(filename)}`;
  res.render('viewer', { filename, pdfUrl });
});

module.exports = router;

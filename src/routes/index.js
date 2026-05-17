const crypto = require('crypto');
const express = require('express');
const multer  = require('multer');
const QRCode  = require('qrcode');
const { deletePDF, UPLOAD_DIR } = require('../storage');
const {
  addPdf, addVersion, setActiveVersion, deleteVersion,
  getPdf, getAllPdfs, deletePdf: deleteDbEntry,
} = require('../db');
const { requireAuth } = require('../middleware');
const config = require('../config');
const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const uuid = crypto.randomUUID();
      req.generatedVersionUuid = uuid;
      cb(null, `${uuid}.pdf`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    cb(ok ? null : new Error('Only PDF files are allowed'), ok);
  },
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const entries = getAllPdfs();
    const pdfs = await Promise.all(
      entries.map(async (entry) => {
        const viewUrl   = `${config.baseUrl}/view/${entry.uuid}`;
        const qrDataUrl = await QRCode.toDataURL(viewUrl, { width: 200, margin: 1 });
        return { ...entry, viewUrl, qrDataUrl };
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
  const slotUuid = crypto.randomUUID();
  addPdf(slotUuid, req.generatedVersionUuid, req.file.originalname);
  res.redirect('/');
});

router.post('/replace/:uuid', requireAuth, upload.single('pdf'), (req, res) => {
  if (!req.file) return res.redirect('/?error=no-file');
  try {
    addVersion(req.params.uuid, req.generatedVersionUuid, req.file.originalname);
  } catch (err) {
    console.error('Replace error:', err.message);
    deletePDF(req.generatedVersionUuid);
    return res.redirect('/?error=replace-failed');
  }
  res.redirect('/');
});

router.post('/activate/:uuid/:versionUuid', requireAuth, (req, res) => {
  try {
    setActiveVersion(req.params.uuid, req.params.versionUuid);
  } catch (err) {
    console.error('Activate error:', err.message);
  }
  res.redirect('/');
});

router.post('/delete-version/:uuid/:versionUuid', requireAuth, (req, res) => {
  const { uuid, versionUuid } = req.params;
  try {
    deleteVersion(uuid, versionUuid);
    deletePDF(versionUuid);
  } catch (err) {
    console.error('Delete version error:', err.message);
  }
  res.redirect('/');
});

router.post('/delete/:uuid', requireAuth, (req, res) => {
  try {
    const versionUuids = deleteDbEntry(req.params.uuid);
    for (const vUuid of versionUuids) deletePDF(vUuid);
  } catch (err) {
    console.error('Delete error:', err.message);
  }
  res.redirect('/');
});

router.get('/view/:uuid', (req, res) => {
  const entry = getPdf(req.params.uuid);
  if (!entry) return res.status(404).render('error', { message: 'PDF nicht gefunden.' });
  res.render('viewer', {
    filename: entry.filename,
    pdfUrl: `/pdf/${entry.uuid}`,
    isAuthenticated: req.isAuthenticated(),
  });
});

module.exports = router;

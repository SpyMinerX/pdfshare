const express = require('express');
const { streamPDF } = require('../storage');
const { getPdf } = require('../db');
const router = express.Router();

router.get('/:uuid', (req, res) => {
  const entry = getPdf(req.params.uuid);
  if (!entry) return res.status(404).send('PDF not found');
  try {
    streamPDF(entry.activeVersion, entry.filename, res);
  } catch (err) {
    res.status(404).send('PDF not found');
  }
});

module.exports = router;

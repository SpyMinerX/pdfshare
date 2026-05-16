const express = require('express');
const { streamPDF } = require('../storage');
const router = express.Router();

router.get('/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  try {
    streamPDF(filename, res);
  } catch (err) {
    res.status(404).send('PDF not found');
  }
});

module.exports = router;

const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function listPDFs() {
  return fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort((a, b) => a.localeCompare(b));
}

function streamPDF(filename, res) {
  const safe = path.basename(filename);
  if (!safe.toLowerCase().endsWith('.pdf')) throw new Error('Not a PDF');

  const filePath = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(filePath)) throw new Error('File not found');

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safe}"`);
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(filePath).pipe(res);
}

function deletePDF(filename) {
  const safe = path.basename(filename);
  if (!safe.toLowerCase().endsWith('.pdf')) throw new Error('Not a PDF');
  fs.unlinkSync(path.join(UPLOAD_DIR, safe));
}

module.exports = { listPDFs, streamPDF, deletePDF, UPLOAD_DIR };

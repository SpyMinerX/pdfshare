const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function streamPDF(uuid, originalFilename, res) {
  const filePath = path.join(UPLOAD_DIR, `${uuid}.pdf`);
  if (!fs.existsSync(filePath)) throw new Error('File not found');

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${originalFilename}"`);
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(filePath).pipe(res);
}

function deletePDF(uuid) {
  const filePath = path.join(UPLOAD_DIR, `${uuid}.pdf`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = { streamPDF, deletePDF, UPLOAD_DIR };

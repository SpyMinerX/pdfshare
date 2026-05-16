const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH  = path.join(DATA_DIR, 'pdfs.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH))  fs.writeFileSync(DB_PATH, '{}');

function load() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function addPdf(uuid, filename) {
  const db = load();
  db[uuid] = { filename, uploadedAt: new Date().toISOString() };
  save(db);
}

function getPdf(uuid) {
  const entry = load()[uuid];
  return entry ? { uuid, ...entry } : null;
}

function getAllPdfs() {
  const db = load();
  return Object.entries(db)
    .map(([uuid, data]) => ({ uuid, ...data }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

function deletePdf(uuid) {
  const db = load();
  delete db[uuid];
  save(db);
}

module.exports = { addPdf, getPdf, getAllPdfs, deletePdf };

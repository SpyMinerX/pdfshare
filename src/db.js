const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH  = path.join(DATA_DIR, 'pdfs.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH))  fs.writeFileSync(DB_PATH, '{}');

function load() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  return migrate(db);
}

// One-time migration: adds versioning fields to legacy single-file entries.
// Legacy entries used the slot UUID as the file name on disk, so activeVersion = slotUuid preserves that.
function migrate(db) {
  let changed = false;
  for (const [uuid, entry] of Object.entries(db)) {
    if (!entry.versions) {
      entry.activeVersion = uuid;
      entry.versions = [{ versionUuid: uuid, filename: entry.filename, uploadedAt: entry.uploadedAt }];
      changed = true;
    }
  }
  if (changed) save(db);
  return db;
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function addPdf(slotUuid, versionUuid, filename) {
  const db = load();
  const now = new Date().toISOString();
  db[slotUuid] = {
    filename,
    uploadedAt: now,
    activeVersion: versionUuid,
    versions: [{ versionUuid, filename, uploadedAt: now }],
  };
  save(db);
}

function addVersion(slotUuid, versionUuid, filename) {
  const db = load();
  const entry = db[slotUuid];
  if (!entry) throw new Error(`Slot ${slotUuid} not found`);
  const now = new Date().toISOString();
  entry.versions.unshift({ versionUuid, filename, uploadedAt: now });
  entry.activeVersion = versionUuid;
  entry.filename = filename;
  save(db);
}

function setActiveVersion(slotUuid, versionUuid) {
  const db = load();
  const entry = db[slotUuid];
  if (!entry) throw new Error(`Slot ${slotUuid} not found`);
  const version = entry.versions.find(v => v.versionUuid === versionUuid);
  if (!version) throw new Error(`Version ${versionUuid} not found in slot ${slotUuid}`);
  entry.activeVersion = versionUuid;
  entry.filename = version.filename;
  save(db);
}

function deleteVersion(slotUuid, versionUuid) {
  const db = load();
  const entry = db[slotUuid];
  if (!entry) throw new Error(`Slot ${slotUuid} not found`);
  if (entry.versions.length <= 1) throw new Error('Cannot delete the only version');
  entry.versions = entry.versions.filter(v => v.versionUuid !== versionUuid);
  if (entry.activeVersion === versionUuid) {
    entry.activeVersion = entry.versions[0].versionUuid;
    entry.filename = entry.versions[0].filename;
  }
  save(db);
}

function getPdf(uuid) {
  const db = load();
  const entry = db[uuid];
  return entry ? { uuid, ...entry } : null;
}

function getAllPdfs() {
  const db = load();
  return Object.entries(db)
    .map(([uuid, data]) => ({ uuid, ...data }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

function renamePdf(slotUuid, newName) {
  const db = load();
  const entry = db[slotUuid];
  if (!entry) throw new Error(`Slot ${slotUuid} not found`);
  const name = newName.trim();
  entry.filename = name.toLowerCase().endsWith('.pdf') ? name : name + '.pdf';
  save(db);
}

function deletePdf(uuid) {
  const db = load();
  const entry = db[uuid];
  const versionUuids = entry ? entry.versions.map(v => v.versionUuid) : [];
  delete db[uuid];
  save(db);
  return versionUuids;
}

module.exports = { addPdf, addVersion, setActiveVersion, deleteVersion, renamePdf, getPdf, getAllPdfs, deletePdf };

const { promisify } = require('util');
const path = require('path');
const SMB2 = require('@marsaud/smb2');
const config = require('./config');

function normalizeShare(shareStr) {
  // Accept both //server/share and \\server\share
  return shareStr.replace(/\//g, '\\').replace(/^(?!\\\\)\\*/, '\\\\');
}

function createClient() {
  return new SMB2({
    share: normalizeShare(config.smb.share),
    domain: config.smb.domain || '',
    username: config.smb.username,
    password: config.smb.password,
    autoCloseTimeout: 5000,
  });
}

async function listPDFs() {
  const client = createClient();
  try {
    const readdir = promisify(client.readdir.bind(client));
    const files = await readdir('');
    return files
      .filter((f) => f.toLowerCase().endsWith('.pdf'))
      .sort((a, b) => a.localeCompare(b));
  } finally {
    client.close();
  }
}

async function readPDF(filename) {
  // Sanitize: strip any directory component to prevent path traversal
  const safe = path.basename(filename);
  if (!safe.toLowerCase().endsWith('.pdf')) {
    throw new Error('Not a PDF file');
  }

  const client = createClient();
  try {
    const readFile = promisify(client.readFile.bind(client));
    return await readFile(safe);
  } finally {
    client.close();
  }
}

module.exports = { listPDFs, readPDF };

# PDF Share

A self-hosted PDF sharing app with QR code generation and Active Directory authentication.
Upload a PDF, get a permanent QR code. Scan it to view the PDF — no login required for viewers.
The QR code URL never changes, so you can replace or roll back the file behind it at any time.

---

## Features

- **QR codes that stay valid forever** — the URL is tied to a slot, not the file. Print the QR code once, swap the PDF as many times as you like.
- **File versioning** — every replaced file is kept. Switch back to any previous version instantly.
- **Rename documents** — change the display title without re-uploading or reprinting the QR code.
- **Active Directory / LDAP login** — only authenticated users can upload, replace, or delete. Viewing is public (just the QR link).
- **Optional group restriction** — limit access to a specific AD security group.
- **Dark / light theme** — persisted in the browser.
- **Drag-and-drop upload** — drop a PDF onto the upload zone or click to browse.
- **QR download** — save any QR code as a PNG with the document title embedded below.

---

## How it works

```
Upload PDF  →  slot UUID (permanent, encodes the QR URL)
                └── version UUID (the actual file on disk)

QR code → /view/{slotUuid} → serves the active version's file
```

When you replace a file, a new version UUID is created and the old file is kept.
The QR URL `/view/{slotUuid}` never changes — only the file it points to does.

---

## Quick start (Docker Compose)

**1. Copy the example env file and fill in your values:**

```bash
cp .env.example .env
```

**2. Edit `.env`:**

```env
SESSION_SECRET=replace-with-a-long-random-string

LDAP_URL=ldaps://your-dc-ip:636
LDAP_BIND_DN=CN=svc-account,OU=SERVICE,DC=example,DC=local
LDAP_BIND_CREDENTIALS=your-service-account-password
LDAP_SEARCH_BASE=DC=example,DC=local
LDAP_SEARCH_FILTER=(&(objectClass=user)(sAMAccountName={{username}}))

# Optional — leave empty to allow all AD users
LDAP_ALLOWED_GROUP=CN=YourGroup,OU=GROUPS,DC=example,DC=local
```

**3. Set your public URL in `docker-compose.yml`:**

```yaml
environment:
  BASE_URL: https://pdf.yourdomain.com
```

This URL is what gets encoded into the QR codes. It must be reachable by the people scanning them.

**4. Start:**

```bash
docker compose up -d
```

The app runs on port `3000`. Put a reverse proxy (nginx, Traefik, etc.) in front and terminate HTTPS there.

---

## Running without Docker

**Requirements:** Node.js 18+

```bash
npm install
cp .env.example .env
# edit .env
BASE_URL=http://localhost:3000 node src/server.js
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BASE_URL` | Yes | `http://localhost:3000` | Public URL encoded in QR codes |
| `PORT` | No | `3000` | Port the server listens on |
| `SESSION_SECRET` | Yes | `change-me-in-production` | Secret for signing session cookies |
| `NODE_ENV` | No | — | Set to `production` for secure cookies (requires HTTPS) |
| `LDAP_URL` | Yes | — | LDAP/LDAPS server URL, e.g. `ldaps://dc.example.local:636` |
| `LDAP_BIND_DN` | Yes | — | Service account DN used to search the directory |
| `LDAP_BIND_CREDENTIALS` | Yes | — | Password for the bind account |
| `LDAP_SEARCH_BASE` | Yes | — | Base DN for user searches |
| `LDAP_SEARCH_FILTER` | No | `(sAMAccountName={{username}})` | LDAP filter; `{{username}}` is replaced at login |
| `LDAP_ALLOWED_GROUP` | No | — | If set, only members of this group DN can log in |

---

## Data storage

All data is stored locally — no external database required.

| Path | Contents |
|---|---|
| `/app/data/pdfs.json` | Document metadata (slots, versions, filenames, timestamps) |
| `/app/uploads/` | PDF files, named `{versionUUID}.pdf` |

Both paths are Docker volumes and survive container restarts and image updates.

**Backup:** copy the `data/` and `uploads/` directories.

---

## Using the app

### Uploading a PDF
Drag a PDF onto the upload bar at the top, or click it to browse. Hit **Hochladen**. A card appears with a QR code that links to the PDF viewer.

### Viewing a PDF
Anyone with the QR code URL can open the PDF — no login needed. The viewer URL is `/view/{uuid}`.

### Renaming a document
Click the **✎** pencil icon next to the card title. Type the new title and press **Speichern**. The displayed title and the browser's download filename both update. The QR code URL is unaffected.

### Replacing the file behind a QR code
Click **Ersetzen** on the card. Select a new PDF and upload it. The old file is saved as a version — the QR code now serves the new file.

### Viewing and restoring version history
After at least one replacement, a **Verlauf (N)** button appears on the card. Click it to expand the version list. Each version shows its original filename and upload date.

- **↩** — make that version active again (QR code serves this file from now on)
- **✕** — permanently delete that version (cannot be undone)

The active version is highlighted with an **Aktiv** badge and cannot be deleted directly (replace it first or activate another version).

### Deleting a document
Click **Löschen** on the card and confirm. This removes the slot, all its versions, and all files from disk. The QR code URL becomes a 404.

### Downloading the QR code as an image
Click **QR speichern**. A PNG is downloaded with the QR code and the document title printed below — ready to embed in a document or print.

---

## Project structure

```
pdfshare/
├── src/
│   ├── server.js          Express app setup, middleware, session
│   ├── config.js          Environment variable loading
│   ├── auth.js            Passport LDAP strategy and group check
│   ├── middleware.js       requireAuth / requireAuthApi helpers
│   ├── db.js              JSON-based persistence (pdfs.json)
│   ├── storage.js         File streaming and deletion from /uploads
│   └── routes/
│       ├── auth.js        GET /login, POST /login, GET /logout
│       ├── index.js       Dashboard, upload, replace, rename, versioning, delete
│       └── pdf.js         GET /pdf/:uuid — streams the active version's file
├── views/
│   ├── index.ejs          Dashboard (upload bar, PDF cards)
│   ├── viewer.ejs         PDF viewer page
│   ├── login.ejs          Login form
│   └── error.ejs          Error page
├── public/
│   └── styles.css         Dark/light theme, all component styles
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## API / route reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Required | Dashboard with all PDF cards |
| `POST` | `/upload` | Required | Upload a new PDF (creates a new slot + QR code) |
| `POST` | `/rename/:uuid` | Required | Change the display title of a slot |
| `POST` | `/replace/:uuid` | Required | Upload a new version for an existing slot |
| `POST` | `/activate/:uuid/:versionUuid` | Required | Switch the active version |
| `POST` | `/delete-version/:uuid/:versionUuid` | Required | Delete a specific version |
| `POST` | `/delete/:uuid` | Required | Delete a slot and all its versions |
| `GET` | `/view/:uuid` | Public | PDF viewer page |
| `GET` | `/pdf/:uuid` | Public | Raw PDF stream (used by the viewer) |
| `GET` | `/login` | — | Login form |
| `POST` | `/login` | — | LDAP authentication |
| `GET` | `/logout` | — | Clear session |

---

## Security notes

- Sessions use HTTP-only, SameSite=Lax cookies. In production (`NODE_ENV=production`) cookies are marked `Secure` — HTTPS is required.
- LDAP TLS verification is disabled (`rejectUnauthorized: false`) to support self-signed domain controller certificates. Enable it in `src/auth.js` if your DC has a trusted certificate.
- Passwords are never stored — LDAP credentials are used only for bind authentication and discarded.
- The service account credentials in `.env` are sensitive. Do not commit `.env` to version control.
- File uploads are limited to 100 MB and PDF MIME type only.

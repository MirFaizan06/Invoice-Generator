# InvoiceGenerator

**Professional offline invoicing and financial tracking for freelancers, agencies, and small businesses.**

Built by **Mir Faizan** — [Tech Bytes Design](mailto:techbytesdesign@gmail.com)

---

## Overview

InvoiceGenerator is a fully offline desktop application that lets you generate professional PDF invoices, track revenue and expenses, manage multiple business profiles, and accept UPI payments — all without any internet connection or cloud dependency. Every byte of your data stays on your machine.

---

## Features

### Invoicing
- Auto-numbered invoices: `TBD/INV/2026/0001` (resets per year, per business)
- Dynamic line items with quantity, rate, and auto-calculated amounts
- GST / tax calculation with configurable percentage
- Professional A4 HTML invoice template with UPI QR code embedded
- One-click PDF generation (no external browser required)
- Invoice duplication, status tracking (Paid / Unpaid / Cancelled)

### Finance Dashboard
- Revenue, expense, and net profit tracking
- 12-month bar chart and area chart breakdown
- Manual expense logging with date and description
- Revenue auto-recorded when an invoice is marked Paid
- Transaction history with delete support

### Business Profiles
- Create and switch between multiple business profiles
- Each profile stores: name, owner, address, phone, email, GSTIN, PAN, CIN, invoice prefix, default tax rate
- Multiple UPI IDs per business with primary selection

### UPI & QR Codes
- UPI QR code generated locally (format: `upi://pay?pa=...&am=...&tn=...`)
- Embedded directly into the invoice HTML and PDF
- High-resolution (200px), no internet needed

### History & Search
- Full invoice history with search across client name, invoice number, project name
- Filter by status (All / Paid / Unpaid / Cancelled)
- Sort by date, amount, or client name
- Inline actions: View, Mark Paid, Generate PDF, Duplicate, Delete

### UI / UX
- Frameless window with custom title bar (drag, minimize, maximize, close)
- Professional light theme with Inter font
- Animated onboarding (5-step wizard on first launch)
- Smooth page transitions and loading states
- Toast notifications for all actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 31 |
| Frontend | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Custom CSS (CSS variables, no Tailwind) |
| Font | Inter via @fontsource (bundled, offline) |
| Icons | Lucide React |
| State | Zustand |
| Charts | Recharts |
| Database | sql.js (WASM SQLite — zero native compilation) |
| QR codes | qrcode (pure JS) |
| PDF | Electron `webContents.printToPDF` |
| Installer | electron-builder + NSIS |

---

## Project Structure

```
InvoiceGenerator/
├── src/
│   ├── main/                     # Electron main process (Node.js)
│   │   ├── index.ts              # Window creation, IPC registration
│   │   ├── preload.ts            # contextBridge → window.electronAPI
│   │   ├── database/
│   │   │   └── index.ts          # sql.js init, schema, SQLiteWrapper
│   │   ├── services/
│   │   │   ├── business.service.ts
│   │   │   ├── invoice.service.ts
│   │   │   ├── finance.service.ts
│   │   │   ├── upi.service.ts
│   │   │   ├── settings.service.ts
│   │   │   ├── template.service.ts   # HTML invoice template
│   │   │   ├── pdf.service.ts        # printToPDF wrapper
│   │   │   └── qr.service.ts         # QR code generator
│   │   ├── ipc/                  # IPC channel handlers
│   │   │   ├── business.ipc.ts
│   │   │   ├── invoice.ipc.ts
│   │   │   ├── finance.ipc.ts
│   │   │   ├── settings.ipc.ts
│   │   │   └── upi.ipc.ts
│   │   └── utils/
│   │       └── paths.ts          # App data paths (userData, invoices/)
│   ├── renderer/                 # React app (Vite)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx               # Router + onboarding gate
│   │   ├── store/
│   │   │   ├── app.store.ts      # Toast notifications, loading state
│   │   │   ├── business.store.ts # Active business
│   │   │   └── invoice.store.ts  # Draft invoice being created
│   │   ├── components/
│   │   │   ├── TitleBar/         # Frameless window controls
│   │   │   ├── Sidebar/          # Navigation sidebar
│   │   │   ├── Layout/           # Sidebar + content wrapper
│   │   │   └── UI/               # Button, Input, Badge, Card, Modal, Toast
│   │   ├── pages/
│   │   │   ├── Onboarding/       # 5-step first-launch wizard
│   │   │   ├── Dashboard/        # Charts + recent invoices
│   │   │   ├── CreateInvoice/    # Invoice form with live totals
│   │   │   ├── InvoicePreview/   # iframe preview + PDF export
│   │   │   ├── History/          # Full invoice list + filters
│   │   │   ├── Finance/          # Revenue/expense analytics
│   │   │   └── Settings/         # Business profiles, UPI IDs
│   │   └── styles/
│   │       ├── variables.css     # Design tokens (colors, spacing, radius)
│   │       ├── global.css        # Base styles, typography, table helpers
│   │       └── animations.css    # Keyframes and utility classes
│   └── shared/
│       └── types.ts              # Shared TypeScript interfaces + ElectronAPI type
├── build/
│   ├── icon.ico                  # App icon (generated by scripts/create-icon.js)
│   ├── icon.png                  # 256px PNG reference
│   └── LICENSE.txt               # EULA shown during NSIS install
├── scripts/
│   └── create-icon.js            # Programmatic icon generator (Jimp + custom ICO writer)
├── dist/                         # Compiled output (gitignored)
│   ├── main/                     # Compiled Electron main process
│   ├── renderer/                 # Vite-built React app
│   └── shared/                   # Compiled shared types
├── dist-app/                     # electron-builder output
│   └── InvoiceGenerator Setup 1.0.0.exe
├── package.json
├── tsconfig.json                 # Renderer TypeScript config
├── tsconfig.main.json            # Main process TypeScript config
├── vite.config.ts
└── PROGRESS.md
```

---

## Getting Started

### Requirements

- Node.js 18+ (tested on Node 24)
- Windows 10/11 (primary target)
- No Visual Studio or native build tools needed

### Installation

```bash
# Clone or copy the project
cd InvoiceGenerator

# Install all dependencies (skips native compilation — none needed)
npm run setup
```

`npm run setup` runs two commands in sequence:
1. `npm install --ignore-scripts` — installs all packages without triggering native build scripts
2. `node node_modules/electron/install.js` — downloads the Electron binary for your platform

### Development

```bash
npm run dev
```

Starts the Vite dev server on `http://localhost:5173` and launches the Electron window with hot module replacement.

### Production Build

```bash
npm run build
```

Compiles the TypeScript main process (`tsc`) and builds the React renderer (`vite build`) into the `dist/` directory.

### Create Installer

```bash
npm run package
```

Runs `npm run build` then `electron-builder` to produce the NSIS installer at:

```
dist-app/InvoiceGenerator Setup 1.0.0.exe
```

### Generate Icon (already done)

```bash
node scripts/create-icon.js
```

Draws the app icon programmatically using Jimp and writes a multi-resolution ICO to `build/icon.ico` (16, 32, 48, 64, 128, 256 px). No Photoshop or external tools required.

---

## Data Storage

All data is stored locally on the user's machine. Nothing is sent to any external server.

| Data | Location |
|---|---|
| SQLite database | `%APPDATA%\InvoiceGenerator\invoicegenerator.db` |
| Invoice HTML files | `%APPDATA%\InvoiceGenerator\invoices\html\` |
| Invoice PDFs | `%APPDATA%\InvoiceGenerator\invoices\pdf\` |

On macOS: `~/Library/Application Support/InvoiceGenerator/`  
On Linux: `~/.config/InvoiceGenerator/`

---

## Database Schema

```sql
businesses        -- Business profiles (name, owner, address, tax info)
upi_ids           -- UPI IDs linked to a business (multiple supported)
invoice_counters  -- Per-business per-year invoice number counter
invoices          -- Invoice records (client, project, amounts, status)
invoice_items     -- Line items belonging to an invoice
transactions      -- Revenue and expense entries
settings          -- Key-value app settings (onboarding status, etc.)
```

---

## IPC API

The renderer communicates with the main process exclusively through `window.electronAPI`, exposed via Electron's `contextBridge`. The full API surface:

```typescript
window.electronAPI.business.getAll()
window.electronAPI.business.create(data)
window.electronAPI.business.update(id, data)
window.electronAPI.business.delete(id)
window.electronAPI.business.setActive(id)

window.electronAPI.invoice.getAll(filters?)
window.electronAPI.invoice.getById(id)
window.electronAPI.invoice.create(data)
window.electronAPI.invoice.update(id, data)
window.electronAPI.invoice.delete(id)
window.electronAPI.invoice.markPaid(id)
window.electronAPI.invoice.markUnpaid(id)
window.electronAPI.invoice.duplicate(id)
window.electronAPI.invoice.generatePDF(id)
window.electronAPI.invoice.getNextNumber(businessId)

window.electronAPI.finance.getSummary(year?)
window.electronAPI.finance.getTransactions(filters?)
window.electronAPI.finance.addExpense(data)
window.electronAPI.finance.deleteTransaction(id)

window.electronAPI.settings.get(key)
window.electronAPI.settings.set(key, value)

window.electronAPI.upi.getForBusiness(businessId)
window.electronAPI.upi.add(data)
window.electronAPI.upi.update(id, data)
window.electronAPI.upi.delete(id)
window.electronAPI.upi.generateQR(upiId, amount, name, invoiceNumber)

window.electronAPI.shell.openPath(filePath)
window.electronAPI.shell.showInFolder(filePath)
window.electronAPI.shell.readFile(filePath)

window.electronAPI.window.minimize()
window.electronAPI.window.maximize()
window.electronAPI.window.close()
```

---

## Invoice Number Format

```
TBD/INV/2026/0001
│   │   │    └─ Zero-padded counter (resets to 0001 each year)
│   │   └─ Calendar year
│   └─ Fixed segment (INV)
└─ Configurable prefix per business (default: TBD)
```

The counter is tracked per business per year in the `invoice_counters` table. Changing the year automatically resets to `0001`.

---

## PDF Generation

Invoices are rendered as HTML using an inline-CSS template and saved to disk. When "Generate PDF" is triggered:

1. A hidden `BrowserWindow` is created
2. The HTML invoice is loaded via `webContents.loadURL`
3. `webContents.printToPDF({ pageSize: 'A4', printBackground: true })` is called
4. The resulting buffer is written to the `invoices/pdf/` directory
5. The folder is opened in Windows Explorer

No Puppeteer, no external Chrome — uses the Chromium already bundled with Electron.

---

## UPI QR Code

QR codes are generated locally using the `qrcode` npm package. The UPI deep link format:

```
upi://pay?pa=<upi_id>&pn=<business_name>&am=<total>&cu=INR&tn=<invoice_number>
```

The QR is encoded as a base64 PNG (`data:image/png;base64,...`) and embedded inline in the invoice HTML, so it appears in both the screen preview and the exported PDF.

---

## Technical Notes

### Why sql.js instead of better-sqlite3?

`better-sqlite3` is a native Node.js addon that requires compilation against the Electron ABI. On systems without Visual Studio Build Tools (the C++ compiler required on Windows), this compilation fails. `sql.js` is a WebAssembly build of SQLite that runs in any JavaScript environment with zero native compilation. The API is wrapped in a compatibility layer (`SQLiteWrapper`) that mirrors the `better-sqlite3` interface (`prepare().get()`, `.all()`, `.run()`), so the service layer code is identical to what you'd write with better-sqlite3.

### Why `webContents.printToPDF` instead of Puppeteer?

Puppeteer bundles its own Chromium (~300MB download). Since Electron already includes Chromium, using `printToPDF` avoids that redundant download while producing identical output. The hidden-window approach also means the PDF generation is completely self-contained within the packaged app.

### ASAR unpacking for sql.js

The sql.js WebAssembly binary (`sql-wasm.wasm`) cannot be read from inside an ASAR archive (Electron's bundling format) because ASAR does not support random-access binary reads. The `electron-builder` config includes:

```json
"asarUnpack": ["node_modules/sql.js/dist/**"]
```

This extracts the sql.js dist files to `app.asar.unpacked/`, which is accessible from the filesystem at runtime. The main process detects whether the app is packaged and resolves the WASM path accordingly.

---

## Scripts Reference

| Command | Description |
|---|---|
| `npm run setup` | First-time install (no native compilation) |
| `npm run dev` | Start development app with hot reload |
| `npm run build` | Compile TS + bundle renderer |
| `npm run build:main` | Compile only the Electron main process |
| `npm run package` | Build + create NSIS installer |
| `node scripts/create-icon.js` | Regenerate `build/icon.ico` from code |

---

## Installer Details

The NSIS installer (`dist-app/InvoiceGenerator Setup 1.0.0.exe`) provides:

- Custom installation directory selection
- Desktop shortcut (optional)
- Start Menu entry
- License agreement screen (from `build/LICENSE.txt`)
- Clean uninstaller via Add/Remove Programs

App size after installation: ~350 MB (includes the full Chromium runtime)

---

## License

Copyright © 2026 Tech Bytes Design. All rights reserved.

This software is proprietary. You may not copy, modify, redistribute, or resell this software without explicit written permission from Tech Bytes Design.

See `build/LICENSE.txt` for the full End User License Agreement.

---

## Author

**Mir Faizan**  
Tech Bytes Design  
techbytesdesign@gmail.com

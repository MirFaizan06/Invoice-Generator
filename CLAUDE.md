# 📄 InvoiceGenerator – Full Product Specification

**Product Name:** InvoiceGenerator  
**Developed By:** Tech Bytes Design  
**Developer:** Mir Faizan  
**Date:** 29/04/2026  
**License:** Proprietary – Cannot redistribute, resell, or modify without permission  

---

# 🎯 PRODUCT VISION

InvoiceGenerator is a **professional, offline-first desktop invoicing and financial tracking application** built using Electron, React, and TypeScript.

It is designed for **freelancers, agencies, and small businesses** who want:
- Clean invoice generation (HTML → PDF)
- Built-in financial tracking
- Multi-business support
- Fully offline control (no cloud dependency)

---

# 🧠 CORE PRINCIPLES

- Offline-first (NO cloud)
- Local database (fast + secure)
- Professional UI (no emojis, only icons)
- Highly structured and scalable codebase
- Modular architecture (future upgrades ready)

---

# 🏗️ TECH STACK

- Electron (latest)
- React + TypeScript
- Vite (build tool)
- Puppeteer (PDF generation)
- SQLite (local DB)
- Zustand (state management)
- Recharts (analytics)
- Lucide React (icons)
- Custom CSS (NO Tailwind)

---

# 📦 CORE FEATURES

## 1. Authentication & Onboarding
- First launch → onboarding flow (multi-step)
- Collect:
  - Name
  - Business Name
  - Address
  - Phone
  - Email
  - Optional:
    - GST
    - PAN
    - CIN
- Smooth slide-based UI
- Save as primary business profile

---

## 2. Multi-Business Profiles
- Create / Edit / Delete profiles
- Switch active business
- Each profile has:
  - Identity
  - Tax info
  - UPI IDs (multiple)

---

## 3. Invoice Creation

### Fields:
- Invoice Number (auto)
- Date
- Billed To
- Project Name
- Items (dynamic list)
  - Title
  - Description
  - Quantity
  - Unit Price
  - Amount (auto)
- Tax %
- Total
- Notes

### Invoice Number Format:
`TBD/INV/<YEAR>/<0001>`
- Reset every year

---

## 4. Invoice Rendering
- Use predefined HTML template
- Based on provided modern layout
- Must support:
  - Multiple items
  - Payment section
  - Notes
  - Bonus section (optional toggle)

---

## 5. PDF Generation
- Use Puppeteer
- A4 optimized
- Print perfect
- No layout shift

---

## 6. UPI QR System

### Format:
```
upi://pay?pa=<upi>&pn=<name>&am=<amount>&cu=INR&tn=<invoice>
```

### Features:
- Generate locally
- Support multiple UPI IDs
- Embed QR in invoice
- High resolution

---

## 7. Invoice History
- Stored in SQLite
- Features:
  - Search
  - Filter
  - Sort
  - View
  - Duplicate
  - Edit
  - Delete

---

## 8. Finance System

### Each Invoice:
- Paid Toggle

### If Paid:
- Add to revenue

### Track:
- Revenue
- Expense
- Profit

### Auto Entry:
"Payment from <Client Name>"

---

## 9. Dashboard (Analytics)

- Revenue Chart
- Expense Chart
- Profit Overview
- Monthly breakdown
- Animated charts (Recharts)

---

## 10. Storage

- HTML invoices
- PDF invoices
- Local DB

---

## 11. Settings

- Business profiles
- UPI IDs
- Default tax
- Invoice prefix

---

## 12. UI/UX

- Clean
- Minimal
- Professional
- Smooth animations
- Tooltips
- Loading states

---

## 13. Installer

- NSIS Installer
- Include:
  - Terms & Conditions
  - License Agreement
  - Branding

---

# 👤 USER FLOW

1. Open app
2. First-time onboarding
3. Dashboard
4. Create Invoice
5. Preview
6. Generate PDF
7. Mark Paid
8. View analytics

---

# 🧩 ARCHITECTURE

## Structure:

- Electron Main
- Renderer (React)
- Shared Types
- Database Layer
- Services Layer

---

# 🤖 AGENT DISTRIBUTION (IMPORTANT)

## Agent 1 – Core Setup
- Electron + Vite + TS setup
- Folder structure
- Build config

## Agent 2 – UI/UX
- React pages
- Components
- Styling
- Animations

## Agent 3 – Invoice Engine
- Form logic
- HTML generation
- Puppeteer integration

## Agent 4 – Database & Finance
- SQLite schema
- CRUD operations
- Finance calculations

## Agent 5 – System & Packaging
- Installer
- File storage
- Settings
- Final integration

---

# ⚠️ RULES FOR CLAUDE CODE

- DO NOT explain commands unless asked
- DO NOT waste tokens
- BUILD production-grade code only
- STRICT typing (TypeScript)
- Modular architecture
- Clean reusable components

---

# 📊 PROGRESS TRACKING

Create a file:
`PROGRESS.md`

Track:
- Completed
- In Progress
- Pending

---

# 🚀 FINAL GOAL

A polished, installable, offline-first invoicing system comparable to commercial tools.

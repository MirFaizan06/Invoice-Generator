import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export const AppPaths = {
  get userData() {
    return app.getPath('userData');
  },
  get database() {
    return path.join(this.userData, 'invodessk.db');
  },
  get invoicesDir() {
    return path.join(this.userData, 'invoices');
  },
  get htmlDir() {
    return path.join(this.invoicesDir, 'html');
  },
  get pdfDir() {
    return path.join(this.invoicesDir, 'pdf');
  },
  get logosDir() {
    return path.join(this.userData, 'logos');
  },
};

export function ensureDirectories(): void {
  [AppPaths.invoicesDir, AppPaths.htmlDir, AppPaths.pdfDir, AppPaths.logosDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

export function getHtmlPath(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/\//g, '-');
  return path.join(AppPaths.htmlDir, `${safe}.html`);
}

export function getPdfPath(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/\//g, '-');
  return path.join(AppPaths.pdfDir, `${safe}.pdf`);
}

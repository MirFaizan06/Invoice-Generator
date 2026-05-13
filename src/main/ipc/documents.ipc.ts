import { ipcMain } from 'electron';
import {
  getDocuments,
  getDocumentById,
  generateDocumentHtml,
  saveDocument,
  markDocumentSigned,
  deleteDocument,
  generateDocumentPDF,
  hasSignedMSA,
} from '../services/document.service';

export function registerDocumentsIPC(): void {
  ipcMain.handle('document:getAll', (_, filters) => getDocuments(filters ?? {}));
  ipcMain.handle('document:getById', (_, id: number) => getDocumentById(id));
  ipcMain.handle('document:generate', (_, docType, clientId, projectId, businessId, fieldValues) =>
    generateDocumentHtml(docType, clientId, projectId, businessId, fieldValues)
  );
  ipcMain.handle('document:save', (_, data) => saveDocument(data));
  ipcMain.handle('document:markSigned', (_, id: number) => markDocumentSigned(id));
  ipcMain.handle('document:generatePDF', (_, id: number) => generateDocumentPDF(id));
  ipcMain.handle('document:delete', (_, id: number) => deleteDocument(id));
  ipcMain.handle('document:hasSignedMSA', (_, clientId: number) => hasSignedMSA(clientId));
}

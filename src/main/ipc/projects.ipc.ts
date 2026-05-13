import { ipcMain } from 'electron';
import {
  getProjectsForClient,
  getProjectsForBusiness,
  createProject,
  updateProject,
  deleteProject,
} from '../services/project.service';

export function registerProjectsIPC(): void {
  ipcMain.handle('project:getForClient', (_, clientId: number) => getProjectsForClient(clientId));
  ipcMain.handle('project:getForBusiness', (_, businessId: number) => getProjectsForBusiness(businessId));
  ipcMain.handle('project:create', (_, data) => createProject(data));
  ipcMain.handle('project:update', (_, id: number, data) => updateProject(id, data));
  ipcMain.handle('project:delete', (_, id: number) => deleteProject(id));
}

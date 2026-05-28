/**
 * api.js — compatibility shim for the static version.
 *
 * The pages (Drivers.jsx, Assumptions.jsx etc.) were copied from finmodel-react
 * and import versionsApi and projectsApi from this file.
 * This shim redirects those calls to Pyodide + localStorage instead of the Node server.
 */

import { compute, validateFormula } from './pyodideEngine';
import {
  getProjects, getInput, getOutput, saveInput, saveOutput,
  createProject, deleteProject as _deleteProject,
} from './storage';

// ── versionsApi ────────────────────────────────────────────────────────────
// Called by useModel and pages for compute/validate operations

export const versionsApi = {
  // Load the latest version for a project
  latest: async (projectId) => {
    const input  = getInput(projectId);
    const output = getOutput(projectId);
    const projects = getProjects();
    const project  = projects.find((p) => p.id === projectId);
    return {
      data: {
        version:     { id: `local_${projectId}`, version_number: 1, is_example: false },
        projectName: project?.name || '',
        input,
        output,
        computedAt:  output ? new Date().toISOString() : null,
      }
    };
  },

  // Save + compute
  save: async (projectId, { inputJson, autoCompute }) => {
    saveInput(projectId, inputJson);
    let output = null;
    let computeError = null;
    if (autoCompute) {
      try {
        output = await compute(inputJson);
        saveOutput(projectId, output);
      } catch (err) {
        computeError = err.message;
      }
    }
    return {
      data: {
        version: { id: `local_${projectId}`, version_number: 1 },
        output,
        computeError,
      }
    };
  },

  // Recompute with saved input
  compute: async (projectId, versionId, activeScenarioId) => {
    const input = getInput(projectId);
    const inputWithScenario = { ...input, active_scenario_id: activeScenarioId || input?.active_scenario_id || 'base' };
    const output = await compute(inputWithScenario);
    saveOutput(projectId, output);
    return { data: { output, computedAt: new Date().toISOString() } };
  },

  // Compute with full input payload (scenario switching)
  computeWithInput: async (projectId, versionId, inputJson) => {
    const output = await compute(inputJson);
    saveOutput(projectId, output);
    return { data: { output, computedAt: new Date().toISOString() } };
  },

  // Formula validation
  validateFormula: async (projectId, versionId, { formula, assumptions, testFy }) => {
    const result = await validateFormula(formula, assumptions, testFy);
    return { data: result };
  },

  // Excel export handled directly in useModel.js via excelExport.js
  exportExcel: async () => { return { data: null }; },
};

// ── projectsApi ────────────────────────────────────────────────────────────

export const projectsApi = {
  list: async () => ({ data: { projects: getProjects() } }),

  create: async (form) => {
    const project = createProject(form);
    return { data: { project } };
  },

  get: async (projectId) => {
    const projects = getProjects();
    const project  = projects.find((p) => p.id === projectId);
    return { data: { project } };
  },

  update: async (projectId, updates) => {
    const projects = getProjects();
    const project  = projects.find((p) => p.id === projectId);
    const updated  = { ...project, ...updates };
    const { saveProject } = await import('./storage');
    saveProject(updated);
    return { data: { project: updated } };
  },

  delete: async (projectId) => {
    _deleteProject(projectId);
    return { data: { message: 'Deleted' } };
  },
};

// ── auth (no-op in static version) ────────────────────────────────────────

export const authApi = {
  login:    async () => ({ data: { user: { id: 'local', email: 'local' }, token: 'local' } }),
  register: async () => ({ data: { user: { id: 'local', email: 'local' }, token: 'local' } }),
  me:       async () => ({ data: { user: { id: 'local', email: 'local' } } }),
};

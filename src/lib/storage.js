/**
 * storage.js — localStorage persistence layer.
 *
 * Replaces the Node API + PostgreSQL layer.
 * All data lives in the user's browser.
 *
 * Key structure:
 *   fp_projects           → array of project metadata
 *   fp_project_{id}       → full model input for that project
 *   fp_output_{id}        → last computed output for that project
 *   fp_active_project     → id of the last opened project
 */

const PREFIX = 'fp_';

function key(k) { return PREFIX + k; }

function read(k) {
  try {
    const v = localStorage.getItem(key(k));
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function write(k, v) {
  try { localStorage.setItem(key(k), JSON.stringify(v)); return true; }
  catch { return false; }
}

function remove(k) {
  try { localStorage.removeItem(key(k)); } catch {}
}

// ── Projects list ──────────────────────────────────────────────────────────

export function getProjects() {
  return read('projects') || [];
}

export function saveProject(project) {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  const updated = { ...project, updatedAt: new Date().toISOString() };
  if (idx >= 0) projects[idx] = updated;
  else projects.unshift(updated);
  write('projects', projects);
  return updated;
}

export function deleteProject(id) {
  const projects = getProjects().filter((p) => p.id !== id);
  write('projects', projects);
  remove(`project_${id}`);
  remove(`output_${id}`);
}

export function createProject({ name, client = '', currency = 'INR Crores', description = '' }) {
  const id = `proj_${Date.now()}`;
  const project = {
    id, name, client, currency, description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveProject(project);
  return project;
}

// ── Model input ────────────────────────────────────────────────────────────

export function getInput(projectId) {
  return read(`project_${projectId}`);
}

export function saveInput(projectId, inputJson) {
  write(`project_${projectId}`, inputJson);
  // Update project updatedAt
  const projects = getProjects();
  const p = projects.find((x) => x.id === projectId);
  if (p) saveProject({ ...p, updatedAt: new Date().toISOString() });
}

// ── Computed output ────────────────────────────────────────────────────────

export function getOutput(projectId) {
  return read(`output_${projectId}`);
}

export function saveOutput(projectId, output) {
  write(`output_${projectId}`, output);
}

// ── Last active project ────────────────────────────────────────────────────

export function getActiveProjectId() { return read('active_project'); }
export function setActiveProjectId(id) { write('active_project', id); }

// ── Export / Import ────────────────────────────────────────────────────────

export function exportModel(projectId) {
  const projects = getProjects();
  const project  = projects.find((p) => p.id === projectId);
  const input    = getInput(projectId);
  const output   = getOutput(projectId);
  const blob = new Blob(
    [JSON.stringify({ project, input, output, exportedAt: new Date().toISOString() }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(project?.name || 'model').replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importModel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.input || !data.project) throw new Error('Invalid model file');
        // Give it a new id to avoid collisions
        const newId = `proj_${Date.now()}`;
        const project = { ...data.project, id: newId };
        saveProject(project);
        saveInput(newId, data.input);
        if (data.output) saveOutput(newId, data.output);
        resolve(project);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsText(file);
  });
}

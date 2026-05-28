import { create } from 'zustand';

// ── Toast store ────────────────────────────────────────────────────────────
export const useToastStore = create((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg) => useToastStore.getState().add(msg, 'success'),
  error:   (msg) => useToastStore.getState().add(msg, 'error'),
  info:    (msg) => useToastStore.getState().add(msg, 'info'),
};

// ── Engine store ───────────────────────────────────────────────────────────
export const useEngineStore = create((set) => ({
  ready:      false,
  loading:    false,
  progress:   0,
  statusMsg:  'Not loaded',
  error:      null,

  setLoading:  (loading)         => set({ loading }),
  setReady:    ()                => set({ ready: true, loading: false, progress: 100, statusMsg: 'Ready' }),
  setProgress: (progress, msg)   => set({ progress, statusMsg: msg }),
  setError:    (error)           => set({ error, loading: false }),
}));

// ── Model store ────────────────────────────────────────────────────────────
export const useModelStore = create((set, get) => ({
  projectId:       null,
  projectName:     '',
  versionId:       null,    // always null in static — no server versions
  input:           null,
  output:          null,
  computedAt:      null,
  isComputing:     false,
  computeError:    null,
  activeScenarioId: 'base',
  isExample:       false,

  setProject: (projectId, projectName, isExample = false) =>
    set({ projectId, projectName, isExample }),

  loadVersion: (versionId, input, output, computedAt) => set({
    versionId,
    input,
    output,
    computedAt,
    activeScenarioId: input?.active_scenario_id || 'base',
    computeError: null,
  }),

  updateInput: (partial) => set((s) => ({
    input: s.input ? { ...s.input, ...partial } : partial,
  })),

  setOutput: (output, computedAt) =>
    set({ output, computedAt, computeError: null }),

  setComputing: (isComputing) => set({ isComputing }),

  setComputeError: (computeError) => set({ computeError }),

  setActiveScenario: (id) => set((s) => ({
    activeScenarioId: id,
    input: s.input ? { ...s.input, active_scenario_id: id } : s.input,
  })),

  reset: () => set({
    projectId: null, projectName: '', versionId: null,
    input: null, output: null, computedAt: null,
    isComputing: false, computeError: null,
    activeScenarioId: 'base', isExample: false,
  }),
}));

// ── Auth store stub (no auth in static version) ───────────────────────────
export const useAuthStore = () => ({
  user: null,
  logout: () => {},
});
useAuthStore.getState = () => ({ user: null, logout: () => {} });

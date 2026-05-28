import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useModelStore, toast } from '../store';
import { compute as pyCompute, validateFormula as pyValidate, initEngine } from '../lib/pyodideEngine';
import { getInput, getOutput, saveInput, saveOutput, setActiveProjectId } from '../lib/storage';

export function useModel() {
  const { projectId } = useParams();

  const versionId        = useModelStore((s) => s.versionId);
  const input            = useModelStore((s) => s.input);
  const output           = useModelStore((s) => s.output);
  const isExample        = useModelStore((s) => s.isExample);
  const isComputing      = useModelStore((s) => s.isComputing);
  const computeError     = useModelStore((s) => s.computeError);
  const activeScenarioId = useModelStore((s) => s.activeScenarioId);
  const storeProjectId   = useModelStore((s) => s.projectId);
  const updateInput      = useModelStore((s) => s.updateInput);

  // ── Load from localStorage when projectId changes ──────────────────────
  useEffect(() => {
    if (!projectId) return;
    const state = useModelStore.getState();
    if (state.projectId === projectId && state.input !== null) return;

    const storedInput  = getInput(projectId);
    const storedOutput = getOutput(projectId);

    if (storedInput) {
      useModelStore.getState().loadVersion(
        `local_${projectId}`,
        storedInput,
        storedOutput,
        storedOutput ? new Date().toISOString() : null,
      );
    } else {
      // Brand new project — initialise with defaults
      import('../pages/defaults').then(({ DEFAULT_MODEL_INPUT }) => {
        const def = DEFAULT_MODEL_INPUT();
        useModelStore.getState().loadVersion(`local_${projectId}`, def, null, null);
        saveInput(projectId, def);
      });
    }

    setActiveProjectId(projectId);
  }, [projectId]);

  // ── Auto-save input to localStorage on every change ───────────────────
  useEffect(() => {
    if (!projectId || !input) return;
    if (useModelStore.getState().projectId !== projectId) return;
    saveInput(projectId, input);
  }, [projectId, input]);

  // ── Save & Compute ─────────────────────────────────────────────────────
  const save = useCallback(async (label = '') => {
    const { input: currentInput } = useModelStore.getState();
    if (!projectId || !currentInput) return;

    useModelStore.getState().setComputing(true);
    try {
      saveInput(projectId, currentInput);
      const output = await pyCompute(currentInput);
      saveOutput(projectId, output);
      const currentScenario = useModelStore.getState().activeScenarioId;
      useModelStore.getState().setOutput(output, new Date().toISOString());
      if (currentScenario) useModelStore.getState().setActiveScenario(currentScenario);
      toast.success('Saved & computed');
      return { output };
    } catch (err) {
      const msg = err.message || 'Compute failed';
      toast.error(msg);
      useModelStore.getState().setComputeError(msg);
    } finally {
      useModelStore.getState().setComputing(false);
    }
  }, [projectId]);

  // ── Switch scenario ────────────────────────────────────────────────────
  const switchScenario = useCallback(async (id) => {
    const state = useModelStore.getState();
    if (state.isComputing) return;
    if (!state.input) return;
    if (state.activeScenarioId === id) return;

    useModelStore.getState().setActiveScenario(id);
    useModelStore.getState().setComputing(true);

    try {
      const freshInput = useModelStore.getState().input;
      const inputWithScenario = { ...freshInput, active_scenario_id: id };
      const output = await pyCompute(inputWithScenario);
      saveOutput(projectId, output);
      useModelStore.getState().setOutput(output, new Date().toISOString());
    } catch (err) {
      toast.error(err.message || 'Scenario compute failed');
    } finally {
      useModelStore.getState().setComputing(false);
    }
  }, [projectId]);

  // ── Export Excel ──────────────────────────────────────────────────────
  const downloadExcel = useCallback(async () => {
    const { input: currentInput, output: currentOutput } = useModelStore.getState();
    if (!currentOutput) { toast.error('Run Save & Compute first'); return; }
    try {
      const { exportToExcel } = await import('../lib/excelExport');
      const projects = (await import('../lib/storage')).getProjects();
      const project  = projects.find((p) => p.id === projectId);
      exportToExcel(project?.name || 'model', currentOutput, currentInput);
      toast.success('Excel downloaded');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    }
  }, [projectId]);

  return {
    projectId,
    versionId,
    input,
    output,
    isExample,
    isComputing,
    computeError,
    activeScenarioId,
    updateInput,
    save,
    switchScenario,
    downloadExcel,
    validateFormula: pyValidate,
  };
}

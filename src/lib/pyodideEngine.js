/**
 * pyodideEngine.js
 *
 * Loads Pyodide + the financial engine Python files into the browser.
 * Exposes compute() and validateFormula() that mirror the Node API exactly,
 * so the rest of the app can use the same interface with zero changes.
 *
 * Engine files are loaded from /public/engine/*.py at runtime.
 */

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';

let pyodide = null;
let loadingPromise = null;

// Progress callback — called with 0..100 during init
let onProgress = null;

export function setProgressCallback(cb) {
  onProgress = cb;
}

function progress(pct, msg) {
  if (onProgress) onProgress(pct, msg);
}

// Engine Python files to load from /public/engine/
const ENGINE_FILES = [
  'models/assumptions.py',
  'compute/formula.py',
  'compute/capex.py',
  'compute/debt.py',
  'compute/drivers.py',
  'compute/income_statement.py',
  'compute/tax.py',
  'compute/balance_sheet.py',
  'compute/cashflow.py',
  'compute/metrics.py',
  'runner.py',
];

export async function initEngine() {
  if (pyodide) return pyodide;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    progress(5, 'Loading Python runtime…');

    // Load Pyodide from CDN
    const script = document.createElement('script');
    script.src = PYODIDE_CDN;
    document.head.appendChild(script);
    await new Promise((res, rej) => {
      script.onload = res;
      script.onerror = rej;
    });

    progress(20, 'Initialising Python…');
    pyodide = await window.loadPyodide();

    progress(40, 'Installing packages…');
    await pyodide.loadPackage(['micropip']);
    const micropip = pyodide.pyimport('micropip');
    await micropip.install(['pydantic', 'numpy-financial']);

    progress(65, 'Loading financial engine…');

    // Set up the package structure in the virtual FS
    pyodide.FS.mkdir('/engine');
    pyodide.FS.mkdir('/engine/models');
    pyodide.FS.mkdir('/engine/compute');

    // Fetch and write each engine file
    // BASE_URL ends with '/' in Vite (e.g. '/finmodel-static/')
    const base = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : import.meta.env.BASE_URL + '/';
    for (const file of ENGINE_FILES) {
      const url = `${base}engine/${file}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(
        `Failed to load ${file} (HTTP ${resp.status}) — check that public/engine/${file} exists in your repo`
      );
      const text = await resp.text();
      pyodide.FS.writeFile(`/engine/${file}`, text);
    }

    // Write __init__.py files so Python treats them as packages
    pyodide.FS.writeFile('/engine/__init__.py', '');
    pyodide.FS.writeFile('/engine/models/__init__.py', '');
    pyodide.FS.writeFile('/engine/compute/__init__.py', '');

    // Add / to sys.path so 'import engine.runner' resolves
    // Also list dirs so we can debug any missing files in the error log
    pyodide.runPython(`
import sys, os
if '/' not in sys.path:
    sys.path.insert(0, '/')
# Verify files landed correctly
_compute_files = os.listdir('/engine/compute')
if 'formula.py' not in _compute_files:
    raise ImportError(f"formula.py missing from /engine/compute. Found: {_compute_files}")
`);

    progress(85, 'Testing engine…');

    // Quick smoke test
    pyodide.runPython(`
from engine.runner import run_model
from engine.models.assumptions import FinancialModelInput
`);

    progress(100, 'Ready');
    return pyodide;
  })();

  return loadingPromise;
}

/**
 * Compute a full model. Mirrors POST /compute.
 * inputJson: the full FinancialModelInput dict
 */
export async function compute(inputJson) {
  const py = await initEngine();

  // Pass input via a JS proxy to avoid serialisation issues
  py.globals.set('_input_dict', inputJson);

  const result = py.runPython(`
import json
from engine.runner import run_model
from engine.models.assumptions import FinancialModelInput

inp = FinancialModelInput(**_input_dict)
output = run_model(inp)
json.dumps(output)
`);

  return JSON.parse(result);
}

/**
 * Validate a single formula. Mirrors POST /validate-formula.
 */
export async function validateFormula(formula, assumptions, testFy = 'FY2033') {
  const py = await initEngine();

  py.globals.set('_formula', formula);
  py.globals.set('_assumptions', assumptions);
  py.globals.set('_test_fy', testFy);

  const result = py.runPython(`
import json, traceback

def _validate():
    yr = int(_test_fy.replace('FY',''))
    ctx = {a['key']: a['value'] for a in _assumptions if a.get('key')}
    ctx['year'] = yr
    ctx['fy']   = _test_fy
    try:
        val = eval(_formula, {"__builtins__": {}}, {
            **ctx,
            'min': min, 'max': max, 'abs': abs,
            'round': round, 'pow': pow,
            'sqrt': __import__('math').sqrt,
            'floor': __import__('math').floor,
            'ceil': __import__('math').ceil,
        })
        return json.dumps({'valid': True, 'result': float(val)})
    except Exception as e:
        return json.dumps({'valid': False, 'error': str(e)})

_validate()
`);

  return JSON.parse(result);
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, '..', 'templates', 'arch', 'scripts', 'validate-transition.py');
let tmpDir;
let stateFile;

function makeState(overrides = {}) {
  const base = {
    project_name: 'test',
    created_at: '2026-01-01T00:00:00Z',
    current_phase: 'not_started',
    phases: {
      evaluation: {
        status: 'not_started',
        prd_loaded: false,
        org_context_loaded: false,
        org_context_source: null,
        analysis_complete: false,
        accepted: false,
        accepted_at: null,
        open_gaps: [],
      },
      methodology: {
        status: 'not_started',
        sub_phase: null,
        pattern_proposed: false,
        pattern_accepted: false,
        pattern_accepted_at: null,
        components_overview_proposed: false,
        components_overview_accepted: false,
        components_overview_accepted_at: null,
        cross_cutting_proposed: false,
        cross_cutting_accepted: false,
        cross_cutting_accepted_at: null,
        accepted: false,
        accepted_at: null,
        proposed_pattern: '',
        component_count: 0,
        cross_cutting_decisions: {},
      },
      components: {
        status: 'not_started',
        components: {},
        current_component: null,
        accepted_count: 0,
        total_count: 0,
        all_accepted: false,
      },
      finalization: {
        status: 'not_started',
        validation_complete: false,
        document_generated: false,
        document_approved: false,
        approved_at: null,
      },
    },
    reopens: { count: 0, max: 2, history: [] },
    decision_count: 0,
    model_used: '',
  };
  return deepMerge(base, overrides);
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'architor-val-'));
  const scriptsDir = path.join(tmpDir, 'scripts');
  await fs.ensureDir(scriptsDir);
  stateFile = path.join(tmpDir, 'state.json');

  // Copy the script to tmp so it resolves state.json correctly
  await fs.copy(SCRIPT_PATH, path.join(scriptsDir, 'validate-transition.py'));
});

afterEach(async () => {
  if (tmpDir) {
    await fs.remove(tmpDir);
  }
});

function runValidatorLocal(currentState, proposedState) {
  const scriptPath = path.join(tmpDir, 'scripts', 'validate-transition.py');

  if (currentState !== null) {
    fs.writeJsonSync(stateFile, currentState, { spaces: 2 });
  } else {
    fs.removeSync(stateFile);
  }

  const proposed = typeof proposedState === 'string'
    ? proposedState
    : JSON.stringify(proposedState);

  const result = spawnSync('python3', [scriptPath], {
    input: proposed,
    encoding: 'utf8',
  });

  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

describe('Bug Fix #1: Empty stdin', () => {
  it('blocks write when stdin is empty', () => {
    const currentState = makeState({ project_name: 'test' });
    const result = runValidatorLocal(currentState, '');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('BLOCKED');
  });
});

describe('Bug Fix #2: Schema validation', () => {
  it('rejects state missing required keys on first write', () => {
    const result = runValidatorLocal(null, { foo: 'bar' });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('missing required key');
  });

  it('rejects state missing phases', () => {
    const result = runValidatorLocal(null, {
      project_name: 'test',
      current_phase: 'not_started',
      phases: {},
      decision_count: 0,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('missing required phase');
  });

  it('accepts valid state on first write', () => {
    const proposed = makeState({ project_name: 'test' });
    const result = runValidatorLocal(null, proposed);
    expect(result.exitCode).toBe(0);
  });
});

describe('Bug Fix #3: New component injection', () => {
  it('blocks new component injected as accepted', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: { status: 'in_progress', components: {}, total_count: 0 },
      },
    });

    const proposed = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: { 'evil-component': { status: 'accepted' } },
          total_count: 1,
        },
      },
    });

    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('must start with status');
  });

  it('allows new component as pending', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: { status: 'in_progress', components: {}, total_count: 0 },
      },
    });

    const proposed = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: { 'new-component': { status: 'pending' } },
          total_count: 1,
        },
      },
    });

    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(0);
  });
});

describe('Bug Fix #4: Component deletion', () => {
  it('blocks removal of accepted component', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: { 'api-gateway': { status: 'accepted' } },
          accepted_count: 1,
          total_count: 1,
        },
      },
    });

    const proposed = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: {},
          accepted_count: 0,
          total_count: 0,
        },
      },
    });

    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Cannot remove accepted');
  });
});

describe('Phase transitions', () => {
  it('blocks skipping phases (evaluation -> components)', () => {
    const current = makeState({
      current_phase: 'evaluation',
      phases: { evaluation: { accepted: true } },
    });
    const proposed = makeState({
      current_phase: 'components',
      phases: { evaluation: { accepted: true } },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
  });

  it('allows evaluation -> methodology when eval accepted', () => {
    const current = makeState({
      current_phase: 'evaluation',
      phases: { evaluation: { accepted: true } },
    });
    const proposed = makeState({
      current_phase: 'methodology',
      phases: { evaluation: { accepted: true } },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(0);
  });

  it('blocks backward transition without reopen', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: { status: 'in_progress' },
      },
    });
    const proposed = makeState({
      current_phase: 'methodology',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: false, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: false },
      },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('forward-only');
  });

  it('allows backward transition with reopen', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: { status: 'in_progress' },
      },
      reopens: { count: 0, max: 2, history: [] },
    });
    const proposed = makeState({
      current_phase: 'methodology',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: false, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: false },
      },
      reopens: { count: 1, max: 2, history: [{ target: 'phase 2c' }] },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(0);
  });

  it('blocks reopen when max exceeded', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
      },
      reopens: { count: 2, max: 2, history: [{}, {}] },
    });
    const proposed = makeState({
      current_phase: 'methodology',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: false },
      },
      reopens: { count: 3, max: 2, history: [{}, {}, {}] },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Maximum reopens');
  });
});

describe('Component status transitions', () => {
  it('allows pending -> in_progress', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: { auth: { status: 'pending' } },
        },
      },
    });
    const proposed = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: { auth: { status: 'in_progress' } },
        },
      },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(0);
  });

  it('allows needs-review -> in_progress', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: { auth: { status: 'needs-review' } },
        },
      },
    });
    const proposed = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: { auth: { status: 'in_progress' } },
        },
      },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(0);
  });

  it('blocks needs-review -> accepted directly', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: { auth: { status: 'needs-review' } },
        },
      },
    });
    const proposed = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: { auth: { status: 'accepted' } },
        },
      },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
  });
});

// ===== SECURITY HARDENING TESTS =====

describe('Security: Reopen limit bypass (Fix 2)', () => {
  it('blocks reopen when proposed state has inflated max', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
      },
      reopens: { count: 2, max: 2, history: [{}, {}] },
    });
    const proposed = makeState({
      current_phase: 'methodology',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: false },
      },
      // Attacker sets max: 999 in proposed state
      reopens: { count: 3, max: 999, history: [{}, {}, {}] },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Maximum reopens');
  });
});

describe('Security: Unknown phase bypass (Fix 3)', () => {
  it('blocks transition to unknown phase name', () => {
    const current = makeState({
      current_phase: 'evaluation',
      phases: { evaluation: { accepted: true } },
    });
    const proposed = makeState({
      current_phase: 'admin',
      phases: { evaluation: { accepted: true } },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('not a recognized phase');
  });

  it('blocks transition from unknown phase name', () => {
    // Simulate corrupted state on disk with unknown phase
    const current = makeState({ current_phase: 'evaluation' });
    current.current_phase = 'hacked';
    const proposed = makeState({ current_phase: 'evaluation' });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('not a recognized phase');
  });
});

describe('Security: Dynamic all_accepted (Fix 4)', () => {
  it('blocks finalization when all_accepted flag is true but no components exist', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: {},
          all_accepted: true,  // Attacker sets flag without any components
          accepted_count: 0,
          total_count: 0,
        },
      },
    });
    const proposed = makeState({
      current_phase: 'finalization',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: {},
          all_accepted: true,
        },
        finalization: { status: 'in_progress' },
      },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('All components must be accepted');
  });

  it('blocks finalization when all_accepted is true but some components are pending', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: {
            auth: { status: 'accepted' },
            api: { status: 'pending' },
          },
          all_accepted: true,  // Flag says true, but api is pending
        },
      },
    });
    const proposed = makeState({
      current_phase: 'finalization',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: {
            auth: { status: 'accepted' },
            api: { status: 'pending' },
          },
          all_accepted: true,
        },
        finalization: { status: 'in_progress' },
      },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('All components must be accepted');
  });

  it('allows finalization when all components are genuinely accepted', () => {
    const current = makeState({
      current_phase: 'components',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: {
            auth: { status: 'accepted' },
            api: { status: 'accepted' },
          },
          all_accepted: true,
        },
      },
    });
    const proposed = makeState({
      current_phase: 'finalization',
      phases: {
        evaluation: { accepted: true },
        methodology: { accepted: true, pattern_accepted: true, components_overview_accepted: true, cross_cutting_accepted: true },
        components: {
          status: 'in_progress',
          components: {
            auth: { status: 'accepted' },
            api: { status: 'accepted' },
          },
          all_accepted: true,
        },
        finalization: { status: 'in_progress' },
      },
    });
    const result = runValidatorLocal(current, proposed);
    expect(result.exitCode).toBe(0);
  });
});

describe('Security: Schema type validation (Fix 6)', () => {
  it('rejects current_phase as number', () => {
    const result = runValidatorLocal(null, {
      project_name: 'test',
      current_phase: 42,
      phases: {
        evaluation: {}, methodology: {}, components: {}, finalization: {},
      },
      decision_count: 0,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('must be a string');
  });

  it('rejects phases as string', () => {
    const result = runValidatorLocal(null, {
      project_name: 'test',
      current_phase: 'not_started',
      phases: 'invalid',
      decision_count: 0,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('must be an object');
  });

  it('rejects decision_count as string', () => {
    const result = runValidatorLocal(null, {
      project_name: 'test',
      current_phase: 'not_started',
      phases: {
        evaluation: {}, methodology: {}, components: {}, finalization: {},
      },
      decision_count: 'many',
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('must be a number');
  });

  it('rejects phase value as non-object', () => {
    const result = runValidatorLocal(null, {
      project_name: 'test',
      current_phase: 'not_started',
      phases: {
        evaluation: 'invalid', methodology: {}, components: {}, finalization: {},
      },
      decision_count: 0,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('must be an object');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamic import for CJS module
let runInit;
beforeEach(async () => {
  const mod = await import('../src/init.js');
  runInit = mod.runInit;
});

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'architor-test-'));
});

afterEach(async () => {
  if (tmpDir) {
    await fs.remove(tmpDir);
  }
});

describe('init', () => {
  it('creates all required directories', async () => {
    await runInit(tmpDir, {});

    expect(await fs.pathExists(path.join(tmpDir, '.arch'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.claude'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.arch', 'components'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, '.arch', 'reviews'))).toBe(true);
    expect(await fs.pathExists(path.join(tmpDir, 'output'))).toBe(true);
  });

  it('creates CLAUDE.md in project root', async () => {
    await runInit(tmpDir, {});

    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    expect(await fs.pathExists(claudeMd)).toBe(true);
    const content = await fs.readFile(claudeMd, 'utf8');
    expect(content).toContain('Architecture Agent');
  });

  it('creates state.json with correct schema', async () => {
    await runInit(tmpDir, {});

    const state = await fs.readJson(path.join(tmpDir, '.arch', 'state.json'));
    expect(state.current_phase).toBe('not_started');
    expect(state.phases.evaluation).toBeDefined();
    expect(state.phases.methodology).toBeDefined();
    expect(state.phases.methodology.sub_phase).toBeNull();
    expect(state.phases.methodology.cross_cutting_accepted).toBe(false);
    expect(state.phases.components).toBeDefined();
    expect(state.phases.finalization).toBeDefined();
    expect(state.reopens).toBeDefined();
    expect(state.reopens.count).toBe(0);
    expect(state.reopens.max).toBe(2);
    expect(state.import_source).toBeNull();
  });

  it('sets project name with --name option', async () => {
    await runInit(tmpDir, { name: 'Test Project' });

    const state = await fs.readJson(path.join(tmpDir, '.arch', 'state.json'));
    expect(state.project_name).toBe('Test Project');
    expect(state.created_at).toBeTruthy();
  });

  it('creates all command files', async () => {
    await runInit(tmpDir, {});

    const commandsDir = path.join(tmpDir, '.claude', 'commands');
    const expectedCommands = [
      'accept.md', 'alternative.md', 'analyze-prd.md', 'decision-log.md',
      'design-component.md', 'generate-docs.md', 'help.md',
      'propose-methodology.md', 'refine.md', 'reopen.md',
      'review-component.md', 'status.md',
    ];

    for (const cmd of expectedCommands) {
      expect(await fs.pathExists(path.join(commandsDir, cmd))).toBe(true);
    }
  });

  it('creates all skill directories', async () => {
    await runInit(tmpDir, {});

    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    const expectedSkills = [
      'architecture-methodology',
      'architecture-patterns',
      'challenge-assumptions',
      'state-manager',
    ];

    for (const skill of expectedSkills) {
      expect(await fs.pathExists(path.join(skillsDir, skill, 'SKILL.md'))).toBe(true);
    }
  });

  it('creates Python validation scripts', async () => {
    await runInit(tmpDir, {});

    const validateScript = path.join(tmpDir, '.arch', 'scripts', 'validate-transition.py');
    const logScript = path.join(tmpDir, '.arch', 'scripts', 'log-decision.py');

    expect(await fs.pathExists(validateScript)).toBe(true);
    expect(await fs.pathExists(logScript)).toBe(true);

    // Check they contain Python code
    const validateContent = await fs.readFile(validateScript, 'utf8');
    expect(validateContent).toContain('#!/usr/bin/env python3');
  });

  it('creates settings.json with hooks', async () => {
    await runInit(tmpDir, {});

    const settings = await fs.readJson(path.join(tmpDir, '.claude', 'settings.json'));
    expect(settings.hooks).toBeDefined();
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.PostToolUse).toBeDefined();
  });

  it('preserves user files on re-init without --force', async () => {
    await runInit(tmpDir, {});

    // Modify a protected file
    const prdPath = path.join(tmpDir, '.arch', 'prd.md');
    await fs.writeFile(prdPath, 'My custom PRD content');

    // Re-init without --force
    await runInit(tmpDir, {});

    const content = await fs.readFile(prdPath, 'utf8');
    expect(content).toBe('My custom PRD content');
  });

  it('overwrites everything with --force', async () => {
    await runInit(tmpDir, {});

    // Modify a protected file
    const prdPath = path.join(tmpDir, '.arch', 'prd.md');
    await fs.writeFile(prdPath, 'My custom PRD content');

    // Re-init with --force
    await runInit(tmpDir, { force: true });

    const content = await fs.readFile(prdPath, 'utf8');
    expect(content).not.toBe('My custom PRD content');
  });

  it('creates output directory with skeleton document', async () => {
    await runInit(tmpDir, {});

    const docPath = path.join(tmpDir, 'output', 'architecture-document.md');
    expect(await fs.pathExists(docPath)).toBe(true);
    const content = await fs.readFile(docPath, 'utf8');
    expect(content).toContain('Executive Summary');
  });
});

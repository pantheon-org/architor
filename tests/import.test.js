import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let runImport;
beforeEach(async () => {
  const mod = await import('../src/import.js');
  runImport = mod.runImport;
});

let tmpDir;
let sourceFile;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'architor-import-'));
  sourceFile = path.join(tmpDir, 'existing-arch.md');
  await fs.writeFile(sourceFile, '# Existing Architecture\n\n## Overview\nMicroservices pattern with 5 components.\n\n## Components\n- API Gateway\n- Auth Service\n- Payment Engine\n');
});

afterEach(async () => {
  if (tmpDir) await fs.remove(tmpDir);
});

describe('import', () => {
  it('creates .arch/existing-architecture.md from source', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(projectDir);
    await runImport(projectDir, sourceFile, {});

    const destPath = path.join(projectDir, '.arch', 'existing-architecture.md');
    expect(await fs.pathExists(destPath)).toBe(true);
    const content = await fs.readFile(destPath, 'utf8');
    expect(content).toContain('Existing Architecture');
    expect(content).toContain('Microservices pattern');
  });

  it('sets reopens.max to 5 in state.json', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(projectDir);
    await runImport(projectDir, sourceFile, {});

    const state = await fs.readJson(path.join(projectDir, '.arch', 'state.json'));
    expect(state.reopens.max).toBe(5);
  });

  it('sets import_source in state.json', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(projectDir);
    await runImport(projectDir, sourceFile, {});

    const state = await fs.readJson(path.join(projectDir, '.arch', 'state.json'));
    expect(state.import_source).toBe('existing-architecture.md');
  });

  it('calls init internally — all scaffold files exist', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(projectDir);
    await runImport(projectDir, sourceFile, {});

    expect(await fs.pathExists(path.join(projectDir, '.arch', 'state.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, '.claude', 'settings.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'CLAUDE.md'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, '.arch', 'scripts', 'validate-transition.py'))).toBe(true);
  });

  it('creates import-architecture command file', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(projectDir);
    await runImport(projectDir, sourceFile, {});

    expect(await fs.pathExists(
      path.join(projectDir, '.claude', 'commands', 'import-architecture.md')
    )).toBe(true);
  });

  it('preserves --name option through to init', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(projectDir);
    await runImport(projectDir, sourceFile, { name: 'Imported Project' });

    const state = await fs.readJson(path.join(projectDir, '.arch', 'state.json'));
    expect(state.project_name).toBe('Imported Project');
    expect(state.import_source).toBe('existing-architecture.md');
    expect(state.reopens.max).toBe(5);
  });

  it('keeps current_phase at not_started after import', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(projectDir);
    await runImport(projectDir, sourceFile, {});

    const state = await fs.readJson(path.join(projectDir, '.arch', 'state.json'));
    expect(state.current_phase).toBe('not_started');
  });

  it('fails if source file does not exist', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(projectDir);

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(
      runImport(projectDir, '/nonexistent/file.md', {})
    ).rejects.toThrow('process.exit called');

    mockExit.mockRestore();
  });

  it('fails if source file is empty', async () => {
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(projectDir);

    const emptyFile = path.join(tmpDir, 'empty.md');
    await fs.writeFile(emptyFile, '');

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(
      runImport(projectDir, emptyFile, {})
    ).rejects.toThrow('process.exit called');

    mockExit.mockRestore();
  });
});

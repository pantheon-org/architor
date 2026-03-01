import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, '..', 'bin', 'architor.js');

function runCli(args = '') {
  try {
    const output = execSync(`node ${CLI_PATH} ${args}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout: output, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.status };
  }
}

describe('CLI', () => {
  it('shows help when no command given', () => {
    const result = runCli();
    expect(result.stdout).toContain('arch-agent');
    expect(result.stdout).toContain('init');
    expect(result.stdout).toContain('verify');
    expect(result.stdout).toContain('reset');
  });

  it('shows version with --version', () => {
    const result = runCli('--version');
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('shows version with -v', () => {
    const result = runCli('-v');
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('shows help for init command', () => {
    const result = runCli('init --help');
    expect(result.stdout).toContain('--name');
    expect(result.stdout).toContain('--force');
  });

  it('shows import command in help', () => {
    const result = runCli();
    expect(result.stdout).toContain('import');
  });

  it('shows help for import command', () => {
    const result = runCli('import --help');
    expect(result.stdout).toContain('--name');
    expect(result.stdout).toContain('--force');
    expect(result.stdout).toContain('source');
  });
});

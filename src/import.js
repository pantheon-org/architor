const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { runInit } = require('./init');

async function runImport(targetDir, sourcePath, options) {
  const resolvedSource = path.resolve(sourcePath);

  // Validate source file exists
  if (!await fs.pathExists(resolvedSource)) {
    console.log(chalk.red(`\n  Source file not found: ${resolvedSource}\n`));
    process.exit(1);
  }

  // Validate source file is non-empty
  const stat = await fs.stat(resolvedSource);
  if (stat.size === 0) {
    console.log(chalk.red('\n  Source file is empty.\n'));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.bold('  arch-agent import'));
  console.log(chalk.dim(`  Source: ${resolvedSource}`));
  console.log('');

  // Run normal init (reuses all scaffolding logic)
  await runInit(targetDir, options);

  // Copy source document to .arch/existing-architecture.md
  const destPath = path.join(targetDir, '.arch', 'existing-architecture.md');
  await fs.copy(resolvedSource, destPath);
  console.log(chalk.green('  + .arch/existing-architecture.md'));

  // Update state.json: set import_source and reopens.max
  const stateFile = path.join(targetDir, '.arch', 'state.json');
  const state = await fs.readJson(stateFile);
  state.import_source = 'existing-architecture.md';
  state.reopens.max = 5;
  await fs.writeJson(stateFile, state, { spaces: 2 });
  console.log(chalk.green('  + import_source set in state.json'));
  console.log(chalk.green('  + reopens.max set to 5 (import mode)'));

  // Print import-specific next steps
  console.log(chalk.bold('\n  Import ready!\n'));
  console.log('  Next steps:');
  console.log('  1. Optionally fill in .arch/org-context.md');
  console.log('  2. Run: claude');
  console.log('  3. Type: /import-architecture');
  console.log('  (The agent will review your existing design phase-by-phase)\n');
}

module.exports = { runImport };

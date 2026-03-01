const { Command } = require('commander');
const chalk = require('chalk');
const { version } = require('../package.json');
const { runInit } = require('./init');
const { runVerify } = require('./verify');
const { runReset } = require('./reset');
const { runImport } = require('./import');

function run(argv) {
  const program = new Command();

  program
    .name('arch-agent')
    .description('Turn Claude Code into a rigorous architecture design assistant')
    .version(version, '-v, --version', 'Show version number');

  program
    .command('init')
    .description('Scaffold .arch/ and .claude/ directories into current project')
    .option('--name <name>', 'Set project name in state.json')
    .option('--force', 'Overwrite existing files without prompting')
    .action((options) => runInit(process.cwd(), options));

  program
    .command('import <source>')
    .description('Import existing architecture document and scaffold for review')
    .option('--name <name>', 'Set project name in state.json')
    .option('--force', 'Overwrite existing files without prompting')
    .action((source, options) => runImport(process.cwd(), source, options));

  program
    .command('verify')
    .description('Check prerequisites (Claude Code, Python 3, git)')
    .action(() => runVerify());

  program
    .command('reset')
    .description('Reset state.json to initial state')
    .option('--yes', 'Skip confirmation prompt')
    .action((options) => runReset(process.cwd(), options));

  if (argv.length <= 2) {
    console.log('');
    console.log(chalk.bold('  arch-agent') + ' — Architecture Agent for Claude Code');
    console.log('');
    program.outputHelp();
    return;
  }

  program.parse(argv);
}

module.exports = { run };

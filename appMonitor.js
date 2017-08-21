const program = require('commander');
const Monitor = require('./src/monitor');
const version = require('./package.json').version;

program
  .version(version)
  .usage('[options] <path>')
  .option('-r, --refresh <number>', 'Rate to refresh interface (ms)')
  .option('-p, --prefix <name>', 'Define the prefix for redis')
  .parse(process.argv);

const prefix = program.prefix || 'sisyphe';
const refresh = program.refresh || 40;
const monitor = new Monitor({
  refresh,
  prefix
});
monitor.launch();

const program = require('commander')
const monitor = require('./src/monitor')
const Queue = require('bull');
const version = require('./package.json').version;
const redis = require("redis"),
  client = redis.createClient();

program
  .version(version)
  .usage('[options] <path>')
  .option('-r, --refresh <number>', 'Rate to refresh interface (ms)')
  .option('-p, --prefix <name>', 'Define the prefix for redis')
  .parse(process.argv);

const prefix = program.prefix || 'sisyphe'
const refresh = program.refresh || 1000
client.keys("*" + prefix + ":*:id", function(err, obj) {
  const keys = []
  for (var i = 0; i < obj.length; i++) {
    keys.push(obj[i].split(':')[1]);
  }
  monitor.init({
    refresh,
    prefix,
    keys
  })
  monitor.launch()
});

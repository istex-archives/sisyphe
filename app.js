const program = require('commander');
const pkg = require('./package.json');
const path = require('path');
const Manufactory = require('./src/manufactory');
const numCPUs = require('os').cpus().length;

program
  .version(pkg.version)
  .usage('[options] <path>')
  .option('-n, --corpusname <name>', "Choose an identifier 's Name", 'default')
  .parse(process.argv);

// Corpusname is default, we stop here
if (program.corpusname === 'default') {
  program.outputHelp();
  process.exit(0);
}

const inputPath = (program.args[0].charAt(0) === '/') ? program.args[0] : path.join(__dirname, program.args[0]);

const workers = ['walker-fs', 'filetype'];
const enterprise = Object.create(Manufactory);
enterprise.init({ inputPath, numCPUs });
workers.map(worker => {
  enterprise.addWorker(worker);
});
enterprise
  .initializeWorkers()
  .then((result) => {
    enterprise.dispatchers[1].on('result', msg => {
      console.log(msg);
    });
    return enterprise.start();
  })
  .then(() => {
    console.log('stop !');
  })
  .catch((error) => {
    console.log(error);
  });

#!/usr/bin/env node

const program = require('commander');
const pkg = require('./package.json');
const path = require('path');
const Manufactory = require('./src/manufactory');
const numCPUs = require('os').cpus().length;
const Queue = require('bull');
const redis = require("redis")
const client = redis.createClient();

program
  .version(pkg.version)
  .usage('[options] <path>')
  .option('-n, --corpusname <name>', 'Corpus name', 'default')
  .option('-c, --config-dir <path>', 'Configuration folder path', 'none')
  .parse(process.argv);

// Corpusname is default, we stop here
if (program.corpusname === 'default' || program.configDir === 'none') {
  program.outputHelp();
  process.exit(0);
}

const argPath = program.args[0];
const inputPath = argPath.charAt(0) === '/' ? argPath : path.join(__dirname, argPath);
const configDirOpt = program.configDir;
const configDir = configDirOpt.charAt(0) === '/' ? configDirOpt : path.join(__dirname, configDirOpt);

const workers = ['walker-fs', 'filetype', 'pdf', 'xml', 'xpath', 'out'];
const options = {
  corpusname: program.corpusname,
  configDir,
  inputPath,
  numCPUs
}


client.flushall((err) => {
  if (err) console.log(err)
  const startQueue = new Queue('start');
  const endQueue = new Queue('end');
  startQueue.add(Date.now())
  const enterprise = Object.create(Manufactory);
  enterprise.init(options);
  workers.map(worker => {
    enterprise.addWorker(worker);
  });
  enterprise
    .initializeWorkers()
    .then(result => {
      enterprise.start()
      console.log('┌ All workers have been initialized');
      return new Promise(function(resolve, reject) {
        enterprise.dispatchers.map(dispatcher=>{
          let i = 0
          dispatcher.on('result', msg => {
            i++
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write('├──── ' + dispatcher.patients[0].workerType + ' ==> ' + i.toString());
          });
          dispatcher.on('stop', patients => {
            const currentWorker = patients[0].workerType
            const lastWorker = workers[workers.length - 1]
            process.stdout.write(' ==> ' + currentWorker + ' has finished\n');
            patients[0].final().then(data=>{ // execute finaljob
              patients.map(patient=>{        // clean forks when finalJob is ending
                patient.fork.kill('SIGTERM');
              })
              if (currentWorker === lastWorker) resolve()
            })
          });
        })
      });
    })
    .then(async () => {
      console.log('└ All workers have completed their work');
      await endQueue.add(new Date().getTime())
      process.exit(0)
    })
    .catch(error => {
      console.log(error);
    });
})

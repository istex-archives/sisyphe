const bluebird = require('bluebird')
const redis = require('redis');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const client = redis.createClient();

const readline = require("readline");
const fs = require("fs");
const path = require('path')

const Manufactory = require("./src/manufactory");
const monitoring = require("./src/monitoring");
/**
 * EntryPoint to Sisyphe
 * @constructor
 */
const sisyphe = {};

/**
 * Init Sisyphe and all components
 * @param {Array.<String>} workers Array with the name of workers
 */
sisyphe.init = async function (session) {
  if (!session) throw new Error("please specify options to launch a session");
  if (!session.hasOwnProperty("corpusname")) throw new Error("please specify corpusname in the argument object");
  if (!session.hasOwnProperty("workers")) throw new Error("please specify workers in the argument object");
  if (!session.hasOwnProperty("inputPath")) throw new Error("please specify inputPath in the argument object");
  if (!session.hasOwnProperty("outputPath")) throw new Error("please specify outputPath in the argument object");
  const workersConf = require(path.resolve(__dirname, "src", "worker.json")).workers;
  session.workers.map(worker => {
    if(!workersConf.includes(worker)) throw new Error(`${worker} doesn't exist`)
  });
  let pathToConf = null
  session.configFilename = 'sisyphe-conf.json'
  session.sharedConfigDir = session.configDir ? path.resolve(session.configDir, "shared") : null // stanard path for the shared configuration directory
  // We search the nearest config in configDir
  const confContents = session.configDir ? fs.readdirSync(session.configDir) : []; // confContent have to be an emtpty array if confDir is not define
  for (let folder of confContents) {
    let currPath = path.join(session.configDir, folder);
    if (fs.lstatSync(currPath).isDirectory() && session.corpusname.includes(folder)) {
      pathToConf = path.resolve(session.configDir, folder, session.configFilename);
      break;
    }
  }
  console.log(pathToConf)
  session.config = fs.existsSync(pathToConf) ? require(pathToConf) : null; // Object representation of sisyphe configuration (or null)
  this.session = session
  if (!session.hasOwnProperty("now")) session.now = Date.now();
  if (!session.hasOwnProperty('silent')) session.silent = false
  
  await client.flushallAsync();
  await client.hmsetAsync('monitoring', 'start', session.now, 'workers', session.workers.toString(), 'corpusname', session.corpusname);
  this.enterprise = Object.create(Manufactory);
  this.enterprise.init(session);
  session.workers.map(worker => {
    this.enterprise.addWorker(worker);
  });
  await this.enterprise.initializeWorkers();
  await monitoring.updateLog('info', 'Initialisation OK');
  if (!this.session.silent) console.log('┌ All workers have been initialized');
  return this
};

/**
 * Launch sisyphe
 */
sisyphe.launch = async function () {
  this.enterprise.dispatchers.map(dispatcher => {
    let i = 0;
    dispatcher.on('result', msg => {
      if (!this.session.silent) {
        i++;
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0, null);
        process.stdout.write('├──── ' + dispatcher.patients[0].workerType + ' ==> ' + i.toString());
      }
    });
    dispatcher.on('stop', async () => {
      const currentWorker = dispatcher.patients[0].workerType;
      const lastWorker = this.session.workers[this.session.workers.length - 1];
      if (!this.session.silent) process.stdout.write(' ==> ' + currentWorker + ' has finished\n');
      await monitoring.updateLog('info', currentWorker + ' has finished');
      if (currentWorker === lastWorker) {
        if (!this.session.silent) console.log('└ All workers have completed their work');
        await monitoring.updateLog('info', 'All workers have completed their work');
        await client.hmsetAsync('monitoring', 'end', Date.now());
        process.exit(0);
        await this.enterprise.exit().then(data => console.log('data', data))
        console.log(process)
        // process.removeAllListeners()
        // console.log(process)
      }
    });
    dispatcher.on('error', async error => {
      monitoring.updateError(error);
    });
  });
  await this.enterprise.start();
};




module.exports = sisyphe

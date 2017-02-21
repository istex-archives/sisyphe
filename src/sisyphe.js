'use strict';

const ChainJobQueue = require('./chain-job-queue'),
  path = require('path'),
  bluebird = require('bluebird'),
  winston = require('winston'),
  fs = bluebird.promisifyAll(require('fs')),
  blessed = require('blessed'),
  redis = require('redis'),
  clientRedis = redis.createClient(),
  cluster = require('cluster'),
  ms = require('pretty-ms'),
  numberFork = require('os').cpus().length;

const loggerInfo = new (winston.Logger)({
  exitOnError: false,
  transports: [
    new (winston.transports.File)({
      name: 'sisyphe-info',
      filename: 'logs/sisyphe.json',
      level: 'info'
    })
  ]
});
const loggerError = new (winston.Logger)({
  exitOnError: false,
  transports: [
    new (winston.transports.File)({
      name: 'sisyphe-error',
      handleExceptions: true,
      filename: 'logs/sisyphe-error.json',
      level: 'error'
    })
  ]
});
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

class Sisyphe {
  constructor(starter, workers) {
    const defaultStarter = {
      module: "walker-fs",
      options: {
        path: path.resolve(__dirname + "/../test/dataset")
      }
    };
    this.starter = starter || defaultStarter;
    const defaultWorkers = [{
      name: "SisypheFileType",
      module: "sisyphe-filetype"
    }, {
      name: "SisypheXML",
      module: "sisyphe-xml"
    }, {
      name : "SisyphePDF",
      module: "sisyphe-pdf"
    }, {
      name : "SisypheXPATH",
      module : "sisyphe-xpath"
    }];
    this.workers = workers || defaultWorkers;
    if (cluster.isMaster) {
      this.screen = blessed.screen({
        smartCSR: true
      });
       // exit the program by using esc q or ctl-c
      this.screen.key(['escape', 'q', 'C-c'], (ch, key) =>{
        return process.exit(0);
      });
      this.textProgress = blessed.box({
        top: 15,
        left: 'center',
        width: '20%',
        align: 'center',
        height: 6,
        content: 'Sisyphe is starting ...',
        tags: true,
        style: {
          fg: 'white',
          border: {
            fg: '#ffffff'
          }
        }
      });

      this.bar = blessed.progressbar({
        parent: this.screen,
        border: 'line',
        style: {
          fg: 'green', bg: 'default',
          bar: {bg: 'green', fg: 'blue'},
          border: { fg: 'default', bg: 'default'}
        },
        pch: ' ',
        top: 8,
        left: 'center',
        width: '50%',
        height: 4,
        filled: 0
      });

      this.list = blessed.list({
        top: '30%',
        right: 0,
        width: '16%',
        align: 'center',
        height: '40%',
        draggable: true,
        scrollable: true,
        border: 'line',
        style: {
          fg: 'white',
          border: {
            fg: 'blue'
          }
        }
      })

      this.tableProgress = blessed.table({
        top: 20,
        left: 'center',
        width: '50%',
        align: 'center',
        height: 10,
        draggable: true,
        tags: true,
        noCellBorders : false,
        border: 'dashed',
        fillCellBorders: true,
        style: {
          cell : {
            fg: 'white',
            border: { fg: 'default', bg: 'default'}
          },
          fg: 'white',
          border: { fg: 'default', bg: 'default'}
        }
      });
      this.screen.append(this.textProgress);
      this.screen.append(this.bar);
      this.screen.append(this.tableProgress);
      this.screen.append(this.list);
      this.screen.title = 'Sisyphe progression dashboard';
      this.screen.render();
    }
  }

  startToGenerateTask() {
    this.sisypheStartAt = new Date().getTime();
    clientRedis.flushall();
    return this.starterModule.start();
  }

  heartbeat() {
    const callFinishers = () => {
      return bluebird.filter(this.workflow.listWorker, (worker) => {
        return worker.features.finalJob !== undefined
      }).map((worker) => {
        return bluebird.promisify(worker.features.finalJob)();
      })
    };

    let self = this;

    setInterval(function(){
      clientRedis.hgetallAsync('sisyphe').then((values) => {
        if(!values) {
          return;
        };
        values.isOK = true
        for (const prop in values) {
          if (values.hasOwnProperty(prop) && values[prop] === undefined) values.isOK = false;
        }
        // Above is the sisyphe dashboard console
        let {totalGeneratedTask=0,totalPerformedTask=0,totalFailedTask=0} = values,
          progress = totalGeneratedTask ? (totalPerformedTask/totalGeneratedTask)*100 : 0;

        self.bar.setProgress(progress);
        self.textProgress.setContent(`~ ${progress.toFixed(2)}%`);
        self.tableProgress.setData([['{yellow-fg}totalGeneratedTask{/}', totalGeneratedTask],
            ['{green-fg}totalPerformedTask{/}', totalPerformedTask],
            ['{red-fg}totalFailedTask{/}', totalFailedTask]])
        self.screen.render();

        const totalJobs = +[values.totalPerformedTask] + +[values.totalFailedTask];
        if (values.isOK && totalJobs >= +values.totalGeneratedTask) {
          clearInterval(this);
          loggerInfo.info("Total jobs created = " + +[values.totalGeneratedTask]);
          loggerInfo.info("Total jobs completed = " + +[values.totalPerformedTask]);
          loggerInfo.info("Total jobs failed = " + +[values.totalFailedTask]);
          loggerInfo.info("Total jobs = " + totalJobs);
          loggerInfo.info('release finishers !');
          callFinishers().then(() => {
            loggerInfo.info('All finalJob executed !');
            clientRedis.del('sisyphe');
            self.sisypheEndAt = new Date().getTime();
            let duration = ms(self.sisypheEndAt-self.sisypheStartAt);
            self.textProgress.setContent(`Finished, took ${duration}`);
            self.screen.render();
            loggerInfo.info(`Sisyphe Finshed all jobs after ${duration}`);
          }).catch((error) => {
            // TODO : rajouter une gestion des erreur pour les logs
            loggerError.error(error);
          });
        }
      }).catch((error) => {
        loggerError.error(error)
      });
    }, 2000);
  }

  start() {
    this.initializeWorker().then(() => {
      if (cluster.isMaster) {
        for (let i = 0; i < numberFork; i++) {
          const fork = cluster.fork();
          fork.on('online', () => {
            loggerInfo.info('fork created');
            this.list.add(`fork created`)
            this.screen.render();
          });
          fork.on('exit', () => {
            cluster.fork();
            loggerInfo.info('fork exit');
            this.list.add(`fork exit`)
          });
        }
        this.initializeStarter()
          .then(() => this.startToGenerateTask())
          .then(() => this.heartbeat());
      } else {
        this.activateWorker();
      }
    });
  }

  initializeWorker() {
    const workerDirectory = path.resolve(__dirname + "/../worker");
    this.workflow = new ChainJobQueue();

    return bluebird.map(this.workers, (worker) => {
      return fs.accessAsync(workerDirectory + "/" + worker.module)
    }).then(() => {
      return this.workers.map((worker) => {
        const pathToWorkerModule = workerDirectory + "/" + worker.module;
        const workerModule = require(pathToWorkerModule);
        const packageWorkerModule = require(pathToWorkerModule + '/package.json');
        return {
          name: packageWorkerModule.name,
          obj: workerModule,
          options: worker.options
        };
      })
    }).then((arrayWorkerModule) => {
      arrayWorkerModule.map((workerModule) => {
        this.workflow.addWorker(workerModule.name, workerModule.obj, workerModule.options);
      });
      this.workflow.createQueueForWorkers();
      return this;
    });
  }

  activateWorker() {
    this.workflow.initializeFeaturesWorkers().addJobProcessToWorkers();
    return this;
  }

  initializeStarter() {
    const starterDirectory = path.resolve(__dirname + "/../starter");
    const pathToStarterModule = starterDirectory + "/" + this.starter.module;
    return fs.accessAsync(pathToStarterModule).then(() => {
      const StarterModule = require(starterDirectory + "/" + this.starter.module);
      this.starterModule = new StarterModule(this.starter.options);

      this.starterModule.setFunctionEventOnData((data) => {
        this.starterModule.totalFile++;
        this.workflow.addTask(data);
      });

      this.starterModule.setFunctionEventOnEnd(() => {
        this.workflow.totalGeneratedTask = this.starterModule.totalFile;
        clientRedis.hset('sisyphe', 'totalGeneratedTask', this.starterModule.totalFile);
        loggerInfo.info('Total jobs generated by starter module = ' + this.starterModule.totalFile);
      });

      return this;
    });
  }
}

module.exports = Sisyphe;

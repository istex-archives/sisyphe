'use strict';

const ChainJobQueue = require('./chain-job-queue'),
  _ = require('lodash'),
  path = require('path'),
  bluebird = require('bluebird'),
  fs = bluebird.promisifyAll(require('fs')),
  glob = require('glob');

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
      name: "Alpha",
      module: "alpha-worker"
    }, {
      name: "Beta",
      module: "beta-worker"
    }];
    this.workers = workers || defaultWorkers;
  }

  start() {
    this.starterModule.start();
  }

  initialize() {
    return this.initializeWorker()
      .then(() => this.initializeStarter())
  }

  initializeWorker() {
    const workerDirectory = path.resolve(__dirname + "/../worker");
    this.workflow = new ChainJobQueue();
    return bluebird.map(this.workers, (worker) => fs.accessAsync(workerDirectory + "/" + worker.module))
      .then(() => {
        return this.workers.map((worker) => {
          const pathToWorkerModule = workerDirectory + "/" + worker.module;
          const workerModule = require(pathToWorkerModule);
          const packageWorkerModule = require(pathToWorkerModule + '/package.json');
          return {
            name: packageWorkerModule.name,
            doTheJob: workerModule.doTheJob
          };
        })
      })
      .then((arrayWorkerModule) => {
        arrayWorkerModule.map((workerModule) => {
          this.workflow.addWorker(workerModule.name, workerModule.doTheJob);
        });
        this.workflow.initialize();
      });
  }

  initializeStarter() {
    const starterDirectory = path.resolve(__dirname + "/../starter");
    const pathToStarterModule = starterDirectory + "/" + this.starter.module;
    return fs.accessAsync(pathToStarterModule)
      .then(() => {
        const StarterModule = require(starterDirectory + "/" + this.starter.module);
        this.starterModule = new StarterModule(this.starter.options.path);
        this.starterModule.addChain(this.workflow);
      });
  }
}

module.exports = Sisyphe;
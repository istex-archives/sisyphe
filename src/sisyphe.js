'use strict';

const ChainJobQueue = require('./chain-job-queue'),
  _ = require('lodash'),
  path = require('path'),
  bluebird = require('bluebird'),
  fs = bluebird.promisifyAll(require('fs')),
  glob = require('glob');

class Sisyphe {
  constructor(redisPort, redisHost) {
    this.listJobsAvailable = [];
    this.listWorkFlow = [];
    this.redisPort = 6379;
    this.redisHost = '127.0.0.1';
    this.numberTask = 0;
  }




  registerJob(name, jobQueueFunction) {
    const jobQueue = Queue(name, this.redisPort, this.redisHost);
    jobQueue.process((job, done) => {
      jobQueueFunction(job.data, done);
    });
    this.listJobsAvailable.push(jobQueue);
  }

  createFlow(name) {
    const newFlow = {
      name: name,
      listJobs: []
    };
    this.listFlow.push(newFlow);
  }

  addJobInFlow(nameFlow, nameJob) {
    const keyFlow = _.findKey(this.listFlow, ['name', nameFlow]);
    const keyJob = _.findKey(this.listJobsAvailable, ['name', nameJob]);
    if (keyJob && keyFlow) {
      const myFlow = this.listFlow[keyFlow];
      const myJob = this.listJobsAvailable[keyJob];
      myJob.on('ready', () => console.log(myJob.name + ' is ready'));
      myFlow.listJobs.push(myJob);
      if (myFlow.listJobs.length > 1) {
        const jobBefore = myFlow.listJobs[keyJob - 1];
        jobBefore.on('completed', (job, result) => {
          myJob.add(job.data);
        })
      }
    }
  }

  addTaskInFlow(nameFlow, task) {
    const myFlow = _.find(this.listFlow, ['name', nameFlow]);
    if (myFlow) {
      myFlow.listJobs[0].add(task);
      this.numberTask++;
    }
  }

  addFinishFlow(nameFlow) {
    const myFlow = _.find(this.listFlow, ['name', nameFlow]);
    if (myFlow) {
      const lastIndexJobs = myFlow.listJobs.length - 1;
      const lastJob = myFlow.listJobs[lastIndexJobs];
      const finish = _.after(2, function() {
        myFlow.listJobs.forEach((job) => {
          job.close().then(() => console.log(job.name, 'terminated'));
        })
      });
      lastJob.on('completed', finish);
    }
  }

  injectJobModules(pathDirModule) {
    pathDirModule = path.normalize(pathDirModule);
    fs.statAsync(pathDirModule).then((stats) => {
      return new Promise((resolve, reject) => {
        if (stats.isDirectory()) {
          resolve()
        } else {
          reject('Your path is not a directory')
        }
      })
    }).then(() => glob.sync(pathDirModule + '/*/'))
      .then((arrayDirectories) => {
        return arrayDirectories.map((directory) => {
          const jobModule = require(directory);
          const packageJobModule = require(directory + '/package.json');
          // console.log(packageJobModule.name);
          // console.log(jobModule);
          return {
            name: packageJobModule.name,
            module: jobModule
          };
          // this.registerJob(packageJobModule.name, jobModule.doTheJob);
        })
      }).then((arrayModule) => {
      // console.log(data);
      arrayModule.forEach((module) => {
        this.registerJob(module.name, module.doTheJob);
      })
    })
  }
}

module.exports = Sisyphe;
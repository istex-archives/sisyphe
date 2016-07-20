'use strict';

const Queue = require('bull');

class ChainJobQueue {
  constructor(redisPort, redisHost) {
    this.listWorker = [];
    this.redisPort = redisPort || 6379;
    this.redisHost = redisHost || '127.0.0.1';
  }

  addWorker(name, jobQueueFunction) {
    const newWorker = {
      name: name,
      jobQueueFunction: jobQueueFunction
    };
    this.listWorker.push(newWorker);
    return this;
  }

  initialize() {
    this.listWorker = this.listWorker.map((worker) => {
      const newWorker = Queue(worker.name, this.redisPort, this.redisHost);
      newWorker.process((job, done) => {
        worker.jobQueueFunction(job.data, done);
      });
      return newWorker;
    }).map((worker, index, listWorker) => {
      // Link Worker between them
      if (index > 0) {
        const workerBefore = listWorker[index - 1];
        workerBefore.on('completed', (job) => {
          worker.add(job.data);
        })
      }
      worker.on('completed', () => {
        this.stopAll();
      });
      worker.on('cleaned', function (job, type) {
        console.log('Cleaned %s %s jobs', job.length, type);
      });
      return worker;
    });
    return this;
  }

  addTask(task) {
    this.listWorker[0].add(task);
    return this;
  }

  stopAll() {
    const countTaskWorker = this.listWorker.map((worker) => worker.count());
    return Promise.all(countTaskWorker)
      .then((arrayCount) => arrayCount.reduce((previous, current) => previous + current))
      .then((activeWorker) => {
        if (activeWorker === 0) {
          const closeWorker = this.listWorker.map((worker) => worker.close());
          return Promise.all(closeWorker);
        }
      }).then(() => {
        const cleanWorker = this.listWorker.map((worker) => worker.clean(5000));
        return Promise.all(cleanWorker);
      });
  }
}

module.exports = ChainJobQueue;
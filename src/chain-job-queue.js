'use strict';

const Queue = require('bull');

class ChainJobQueue {
  constructor(redisPort, redisHost) {
    this.listWorker = [];
    this.numberTotalTask = Infinity;
    this.redisPort = redisPort || 6379;
    this.redisHost = redisHost || '127.0.0.1';
  }

  addWorker(name, jobQueueFunction) {
    const newWorker = {
      name: name,
      totalTaskPerformed: 0,
      jobQueueFunction: jobQueueFunction
    };
    this.listWorker.push(newWorker);
    return this;
  }

  initialize() {
    this.createQueueForWorkers().addJobProcessToWorkers();
    return this;
  }

  createQueueForWorkers() {
    this.listWorker = this.listWorker.map((worker) => {
      worker.queue = Queue(worker.name, this.redisPort, this.redisHost);
      return worker;
    });
    return this;
  }

  addJobProcessToWorkers() {
    this.listWorker.map((worker) => {
      worker.queue.process((job, done) => {
        worker.totalTaskPerformed++;
        if (worker.totalTaskPerformed === this.numberTotalTask) worker.queue.close();
        worker.jobQueueFunction(job.data, done);
      });
      return worker;
    }).map((worker, index, listWorker) => {
      // Link Worker between them
      if (index > 0) {
        const workerBefore = listWorker[index - 1];
        workerBefore.queue.on('completed', (job) => {
          worker.queue.add(job.data);
        })
      }
      return worker;
    });
    return this;
  }

  addTask(task) {
    this.listWorker[0].queue.add(task);
    return this;
  }

  cleanAll() {
    const cleanTaskCompleted = this.listWorker.map((worker) => worker.clean(10000));
    return Promise.all(cleanTaskCompleted);
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
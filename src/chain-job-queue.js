'use strict';

const Queue = require('bull'),
  debounce = require('lodash/debounce'),
  throttle = require('lodash/throttle');

class ChainJobQueue {
  constructor(redisPort, redisHost) {
    this.listWorker = [];
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
    this.listWorker.map((worker, index, listWorker) => {
      const debouncedQueueClose = debounce((worker) => {
        worker.queue.count().then((result) => {
          console.log(worker.totalTaskPerformed, 'tache effectué pour le worker', worker.name);
          console.log(result, 'tâche restante pour le worker', worker.name);
          if (result === 0) worker.queue.close().then(() => {
            console.log(worker.name, 'is closed');
            const lastIndex = listWorker.length - 1;
            if (index === lastIndex) process.exit();
          });

        })
      }, 3000);
      const throttledQueueClean = throttle((worker) => {
        worker.queue.clean(2000);
      }, 1000);
      worker.queue.process((job, done) => {
        worker.totalTaskPerformed++;
        debouncedQueueClose(worker);
        throttledQueueClean(worker);
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
}

module.exports = ChainJobQueue;
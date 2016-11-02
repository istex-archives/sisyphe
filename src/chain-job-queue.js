'use strict';

const Queue = require('bull'),
  bluebird = require('bluebird'),
  redis = require('redis'),
  logger = require('winston'),
  debounce = require('lodash/debounce'),
  throttle = require('lodash/throttle'),
  clientRedis = redis.createClient();

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

class ChainJobQueue {
  constructor(redisPort, redisHost) {
    this.listWorker = [];
    this.redisPort = redisPort || 6379;
    this.redisHost = redisHost || '127.0.0.1';
  }

  addWorker(name, jobQueueFunction, finalFunction) {
    const newWorker = {
      name: name,
      totalPerformedTask: 0,
      totalFailedTask: 0,
      jobQueueFunction: jobQueueFunction,
      finalFunction: finalFunction
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
      const throttledQueueClean = throttle((worker) => {
        worker.queue.clean(100);
        worker.queue.clean(100, 'failed');
      }, 1000);

      worker.queue.process((job, done) => {
        throttledQueueClean(worker);
        worker.jobQueueFunction(job.data, done);
      });
      return worker;
    }).map((worker, index, listWorker) => {
      worker.queue.on('failed', (job) => {
        worker.totalFailedTask++;
        clientRedis.hincrby('sisyphe', job.queue.name + ':totalFailedTask', 1);
        clientRedis.hincrby('sisyphe', 'totalFailedTask', 1);
      });

      worker.queue.on('completed', (job) => {
        const isTheLastWorker = listWorker.length === (index + 1);
        if (isTheLastWorker) {
          worker.totalPerformedTask++;
          clientRedis.hincrby('sisyphe',  job.queue.name + ':totalPerformedTask', 1);
          clientRedis.hincrby('sisyphe', 'totalPerformedTask', 1);
          worker.totalPerformedTask = 0;
        } else {
          const workerAfter = listWorker[index + 1];
          workerAfter.queue.add(job.data);
        }
      });

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
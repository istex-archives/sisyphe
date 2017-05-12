'use strict';

const Queue = require('bull'),
  Promise = require('bluebird'),
  kuler = require('kuler'),
  winston = require('winston'),
  debounce = require('lodash/debounce'),
  throttle = require('lodash/throttle');

const logger = new (winston.Logger)({
  exitOnError: false,
  transports: [
    new (winston.transports.File)({
      name : 'sisyphe-error',
      handleExceptions: true,
      filename: 'logs/sisyphe-data-error.json',
      level: 'error'
    })
  ]
});

// Check redis connection
const redis = require('redis'),
clientRedis = redis.createClient();

clientRedis.on('error', err=>{
  console.error(`Redis does not appears to be started`);
  logger.error(err);
});

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

class ChainJobQueue {
  constructor(redisPort, redisHost, isInspected) {
    this.listWorker = [];
    this.redisPort = redisPort || 6379;
    this.redisHost = redisHost || '127.0.0.1';
    this.isInspected = isInspected || false;
  }

  addWorker(name, worker, options) {
    const newWorker = {
      name: name,
      totalPerformedTask: 0,
      totalFailedTask: 0,
      features: worker,
      options
    };
    this.listWorker.push(newWorker);
    return this;
  }

  initializeFeaturesWorkers() {
    this.listWorker.filter((worker) => {
      return worker.features.init !== undefined
    }).map((worker) => {
      worker.features.init(worker.options)
    });
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
        worker.features.doTheJob(job.data, done);
      });
      return worker;
    }).map((worker, index, listWorker) => {
      worker.queue.on('failed', (job, error) => {
        logger.error({errorFailed: error.toString(), data: job.data});
        if(this.isInspected){
          console.error(error);
        }
        worker.totalFailedTask++;
        clientRedis.hincrby('sisyphe', job.queue.name + ':totalFailedTask', 1);
        clientRedis.hincrby('sisyphe', 'totalFailedTask', 1);
      });

      worker.queue.on('completed', (job, result) => {
        let totalGeneratedTask, totalPerformedTask;
        const isTheLastWorker = listWorker.length === (index + 1);
        if (isTheLastWorker) {
          worker.totalPerformedTask++;
          clientRedis.hincrby('sisyphe', 'totalPerformedTask', 1);
          worker.totalPerformedTask = 0;
        } else {
          const workerAfter = listWorker[index + 1];
          workerAfter.queue.add(result, {removeOnComplete: true, timeout: 300000});
        }
      });

      worker.queue.on('stalled', function (job) {
        logger.error({errorStalled: true, data: job.data});
      });

      worker.queue.on('error', function (error) {
        logger.error({errorSisyphe: error.toString()});
      });

      return worker;
    });
    return this;
  }

  addTask(task) {
    this.listWorker[0].queue.add(task, {removeOnComplete: true, timeout: 300000});
    return this;
  }
}

module.exports = ChainJobQueue;
'use strict';

const Queue = require('bull'),
  bluebird = require('bluebird'),
  redis = require('redis'),
  kuler = require('kuler'),
  winston = require('winston'),
  debounce = require('lodash/debounce'),
  throttle = require('lodash/throttle'),
  clientRedis = redis.createClient();

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({
      filename: 'logs/sisyphe.log',
      level: 'info'
    }),
    new (winston.transports.File)({
      'name' : 'sisyphe-error',
      filename: 'logs/sisyphe-error.json',
      level: 'error'
    }),
    new (winston.transports.File)({
      'name' : 'sisyphe-warn',
      filename: 'logs/sisyphe-warning.json',
      level: 'warn'
    })
  ]
});
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

class ChainJobQueue {
  constructor(redisPort, redisHost) {
    this.listWorker = [];
    this.redisPort = redisPort || 6379;
    this.redisHost = redisHost || '127.0.0.1';
  }

  addWorker(name, worker) {
    const newWorker = {
      name: name,
      totalPerformedTask: 0,
      totalFailedTask: 0,
      features: worker
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
        worker.features.doTheJob(job.data, done);
      });
      return worker;
    }).map((worker, index, listWorker) => {
      worker.queue.on('failed', (job, error) => {
        logger.error({errorFailed: error, data: job});
        process.stdout.write(kuler('|', 'red'));
        worker.totalFailedTask++;
        clientRedis.hincrby('sisyphe', job.queue.name + ':totalFailedTask', 1);
        clientRedis.hincrby('sisyphe', 'totalFailedTask', 1);
      });

      worker.queue.on('completed', (job, result) => {
        process.stdout.write(kuler('-', 'green'));
        const isTheLastWorker = listWorker.length === (index + 1);
        if (isTheLastWorker) {
          worker.totalPerformedTask++;
          clientRedis.hincrby('sisyphe', 'totalPerformedTask', 1);
          worker.totalPerformedTask = 0;
        } else {
          const workerAfter = listWorker[index + 1];
          workerAfter.queue.add(result, {removeOnComplete: true, timeout: 60000});
        }
      });

      worker.queue.on('stalled', function (job) {
        logger.error({errorStalled: true, data: job});
      });

      worker.queue.on('error', function (error) {
        logger.error({errorSisyphe: error});
      });

      return worker;
    });
    return this;
  }

  addTask(task) {
    this.listWorker[0].queue.add(task, {removeOnComplete: true, timeout: 60000});
    return this;
  }
}

module.exports = ChainJobQueue;
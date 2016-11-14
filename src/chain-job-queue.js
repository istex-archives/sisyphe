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
      worker.queue.process((job, done) => {
        worker.jobQueueFunction(job.data, done);
      });
      return worker;
    }).map((worker, index, listWorker) => {
      worker.queue.on('failed', (job, error) => {
        logger.error(error);
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
          clientRedis.hincrby('sisyphe',  job.queue.name + ':totalPerformedTask', 1);
          clientRedis.hincrby('sisyphe', 'totalPerformedTask', 1);
          worker.totalPerformedTask = 0;
        } else {
          const workerAfter = listWorker[index + 1];
          workerAfter.queue.add(result, {removeOnComplete: true});
        }
      });

      return worker;
    });
    return this;
  }

  addTask(task) {
    this.listWorker[0].queue.add(task, {removeOnComplete: true});
    return this;
  }
}

module.exports = ChainJobQueue;
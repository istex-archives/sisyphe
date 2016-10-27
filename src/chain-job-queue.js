'use strict';

const Queue = require('bull'),
  bluebird = require('bluebird'),
  redis = require('redis'),
  logger = require('winston'),
  EventEmitter = require('events'),
  zipObject = require('lodash/zipObject'),
  debounce = require('lodash/debounce'),
  throttle = require('lodash/throttle'),
  clientRedis = redis.createClient();

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

class ChainJobQueue extends EventEmitter {
  constructor(redisPort, redisHost) {
    super();
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
    const self = this;
    this.listWorker.map((worker) => {
      const throttledQueueClean = throttle((worker) => {
        worker.queue.clean(100);
        worker.queue.clean(100, 'failed');
      }, 1000);

      worker.queue.process((job, done) => {
        // throttledQueueClean(worker);
        worker.jobQueueFunction(job.data, done);
      });
      return worker;
    }).map((worker, index, listWorker) => {
      const sendCountToRedis = throttle((count, key) => {
        clientRedis.incrbyAsync(key, count).then(() => {
          worker[key] = 0;
        })
      }, 500);

      worker.queue.on('failed', (job, error) => {
        worker.totalFailedTask++;
        sendCountToRedis(worker.totalFailedTask, 'totalFailedTask');
      });

      const debounceSetCount = debounce((worker) => {
        clientRedis.incrbyAsync('totalPerformedTask', worker.totalPerformedTask).then(() => {
          worker.totalPerformedTask = 0;
          return clientRedis.mgetAsync('totalGeneratedTask', 'totalPerformedTask', 'totalFailedTask')
        }).then((values) => {
          const metrics = zipObject(['totalGeneratedTask', 'totalPerformedTask', 'totalFailedTask'], values);
          logger.info("Total jobs created = " + metrics.totalGeneratedTask);
          logger.info("Total jobs completed = " + metrics.totalPerformedTask);
          logger.info("Total jobs failed = " + metrics.totalFailedTask);
          const totalJobs = +metrics.totalPerformedTask + +metrics.totalFailedTask;
          logger.info("Total jobs = " + totalJobs);
          if (+metrics.totalPerformedTask + +metrics.totalFailedTask >= +metrics.totalGeneratedTask) {
            logger.info('release finishers !');
            self.emit('workers-out-of-work');
            clientRedis.del('totalGeneratedTask', 'totalPerformedTask', 'totalFailedTask');
          }
        });
      }, 1000);
      // Math.floor(Math.random() * 500 + 1000)

      const isTheLastWorker = listWorker.length === (index + 1);
      if (isTheLastWorker) {
        worker.queue.on('completed', () => {
          worker.totalPerformedTask++;
          // debounceSetCount(worker);
          sendCountToRedis(worker.totalPerformedTask, 'totalPerformedTask');
        });
      }

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
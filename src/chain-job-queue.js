'use strict';

const Queue = require('bull'),
  bluebird = require('bluebird'),
  redis = require('redis'),
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

  addWorker(name, jobQueueFunction) {
    const newWorker = {
      name: name,
      totalPerformedTask: 0,
      totalErrorTask: 0,
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
    const self = this;
    this.listWorker.map((worker) => {
      const throttledQueueClean = throttle((worker) => {
        worker.queue.clean(100);
      }, 1000);

      worker.queue.process((job, done) => {
        throttledQueueClean(worker);
        worker.jobQueueFunction(job.data, done);
      });
      return worker;
    }).map((worker, index, listWorker) => {
      worker.queue.on('error', () => worker.totalErrorTask++);

      const isTheLastWorker = listWorker.length === (index + 1);
      const debounceSetCount = debounce((worker) => {
        clientRedis.incrbyAsync('totalPerformedTask', worker.totalPerformedTask).then(() => {
          return clientRedis.mgetAsync('totalGeneratedTask', 'totalPerformedTask')
        }).then((values) => {
          const metrics = zipObject(['totalGeneratedTask', 'totalPerformedTask'], values);
          if (metrics.totalGeneratedTask === metrics.totalPerformedTask) {
            console.log('release finishers !');
            self.emit('workers-out-of-work');
          }
        });
      }, 1000);

      if (isTheLastWorker) {
        worker.queue.on('completed', () => {
          worker.totalPerformedTask++;
          debounceSetCount(worker);
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
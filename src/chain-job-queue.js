'use strict';

const Queue = require('bull'),
  bluebird = require('bluebird'),
  redis = require('redis'),
  kuler = require('kuler'),
  winston = require('winston'),
  debounce = require('lodash/debounce'),
  throttle = require('lodash/throttle'),
  blessed = require('blessed'),
  clientRedis = redis.createClient();

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

const screen = blessed.screen({
  smartCSR: true
});

 // exit the program by using esc q or ctl-c
screen.key(['escape', 'q', 'C-c'], (ch, key) =>{
  return process.exit(0);
});

const textProgress = blessed.box({
  top: 'center',
  left: 'center',
  width: '20%',
  align: 'center',
  height: 6,
  content: 'Sisyphe is starting ...',
  tags: true,
  style: {
    fg: 'white',
    border: {
      fg: '#ffffff'
    },
    hover: {
      bg: 'green'
    }
  }
});

const bar = blessed.progressbar({
  parent: screen,
  border: 'line',
  style: {
    fg: 'green', bg: 'default',
    bar: {bg: 'green', fg: 'blue'},
    border: { fg: 'default', bg: 'default'}
  },
  pch: ' ',
  top: 8,
  left: 'center',
  width: '50%',
  height: 4,
  filled: 0
});

const tableProgress = blessed.table({
  top: 20,
  left: 'center',
  width: '50%',
  align: 'center',
  height: 10,
  tags: true,
  noCellBorders : false,
  border: 'dashed',
  fillCellBorders: true,
  style: {
    cell : {
      fg: 'white',
      border: { fg: 'default', bg: 'default'}
    },
    fg: 'white',
    border: { fg: 'default', bg: 'default'}
  }
});

screen.append(textProgress);
screen.append(bar);
screen.append(tableProgress);
screen.render();
  
screen.title = 'Sisyphe progression dashboard';

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

class ChainJobQueue {
  constructor(redisPort, redisHost) {
    this.listWorker = [];
    this.redisPort = redisPort || 6379;
    this.redisHost = redisHost || '127.0.0.1';
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
        process.stdout.write(kuler('|', 'red'));
        worker.totalFailedTask++;
        clientRedis.hincrby('sisyphe', job.queue.name + ':totalFailedTask', 1);
        clientRedis.hincrby('sisyphe', 'totalFailedTask', 1);
      });

      worker.queue.on('completed', (job, result) => {
        //process.stdout.write(kuler('-', 'green'));
        let totalGeneratedTask, totalPerformedTask;

        clientRedis.hgetAsync('sisyphe','totalGeneratedTask').then(val=>{
          totalGeneratedTask = val;
          return clientRedis.hgetAsync('sisyphe','totalPerformedTask');
        }).then(val=>{
          totalPerformedTask = val || 0;
          return clientRedis.hgetAsync('sisyphe','totalFailedTask');
        }).then(totalFailedTask=>{
          totalFailedTask = totalFailedTask || 0;
          let progress = (totalPerformedTask/totalGeneratedTask)*100;
          bar.setProgress(progress);
          textProgress.setContent(`~ ${progress.toFixed(2)}%`)
          tableProgress.setData([['{yellow-fg}totalGeneratedTask{/}', totalGeneratedTask],
            ['{green-fg}totalPerformedTask{/}', totalPerformedTask],
            ['{red-fg}totalFailedTask{/}', totalFailedTask]])
          screen.render();
        })
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
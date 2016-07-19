'use strict';

const ChainJobQueue = require('./src/chain-job-queue');

const chain = new ChainJobQueue();
chain.addWorker('First Worker', (data, next) => {
  setTimeout(() => {
    data.count++;
    console.log(data);
    next();
  }, data.time);
}).addWorker('Second Worker', (data, next) => {
  setTimeout(() => {
    data.count++;
    console.log(data);
    next();
  }, data.time);
}).initialize()
.addTask({
  message: 'Première tache',
  count: 0,
  time: 100
});

setTimeout(() => {
  chain.stop().then(() => {
    console.log('chain stopped');
  });
}, 2000);
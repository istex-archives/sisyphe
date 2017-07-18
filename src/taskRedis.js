const kue = require('kue')
const queue = {};
queue.init = function (options) {
  this.redisKey = options.redisKey
  this.queue = kue.createQueue();
  this.queue.on('error', (err) => {
    return {
      error: err
    }
  });
}

queue.get = this.queue.queue.process;

module.exports = queue
const bluebird = require('bluebird');
const redis = require('redis');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient();
const monitoring = {
  log: {
    error: [],
    warning: [],
    info: []
  },
  workersError: {}
};
monitoring.updateLog = async function (type, string) {
  if (type === 'error') {
    const error = string.err;
    if (string.hasOwnProperty('job') && string.job.hasOwnProperty('workerType')) {
      if (!this.workersError[string.job.workerType]) this.workersError[string.job.workerType] = [];
      this.workersError[string.job.workerType].push(string.job);
    }
    if (error.hasOwnProperty('stack')) string = error.message + ': ' + error.stack.split('\n')[1];
    else string = '';
    if (error.hasOwnProperty('infos') && Array.isArray(error.infos)) {
      for (var i = 0; i < error.infos.length; i++) {
        var info = error.infos[i];
        string += '##' + info;
      }
    }
  }
  this.log[type].push(string);
  await client.hsetAsync('monitoring', 'log', JSON.stringify(this.log), 'workersError', JSON.stringify(this.workersError));
};

module.exports = monitoring;

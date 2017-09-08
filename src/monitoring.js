const bluebird = require("bluebird");
const redis = require("redis");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient();
const monitoring = {
  log: {
    error: [],
    warning: [],
    info: []
  }
};
monitoring.updateLog = async function(type, string) {
  if (
    string.hasOwnProperty('message') &&
    string.hasOwnProperty('stack') ||
    type === 'error'
  ) return this.updateError(string)

  this.log[type].push(string);
  await client.hsetAsync(
    "monitoring",
    "log",JSON.stringify(this.log)
  );
};

monitoring.updateError = async function(err) {
  if (
    !(err.hasOwnProperty('message') && err.hasOwnProperty('stack')) 
    && typeof String
  ) {
    err = new Error(err);
    err.stack = undefined
  } 

  

  this.log["error"].push(err);
  await client.hsetAsync(
    "monitoring",
    "log", JSON.stringify(this.log)
  );
};

monitoring.updateError = async function (err) {
  const error = {
    message: err.message,
    stack: err.stack,
    infos: err.infos
  };
  this.log['error'].push(error);
  await client.hsetAsync('monitoring', 'log', JSON.stringify(this.log), 'workersError', JSON.stringify(this.workersError));
};

module.exports = monitoring;

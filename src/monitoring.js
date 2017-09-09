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
  },
  workersError: []
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
  if (err.hasOwnProperty('infos')) this.workersError.push(err)
  err.time = Date.now()
  this.log["error"].push(err);
  await client.hsetAsync(
    "monitoring",
    "log", JSON.stringify(this.log),
    "workersError", JSON.stringify(this.workersError)
  );
};

module.exports = monitoring;

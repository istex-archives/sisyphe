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
  const redisError = {
    message: 'Unknomwn error',
    stack: '',
    infos: 'No information',
    time: Date.now()
  }
  if (err.hasOwnProperty('message')) redisError.message = err.message
  if (err.hasOwnProperty("infos")) redisError.infos = err.infos;
  if (err.hasOwnProperty("stack")) redisError.stack = err.stack;

  if (err.hasOwnProperty("infos") && err.infos.hasOwnProperty("path")) this.workersError.push(redisError);
  this.log["error"].push(redisError);

  await client.hmsetAsync(
    "monitoring",
    "log", JSON.stringify(this.log),
    "workersError", JSON.stringify(this.workersError)
  );
};

module.exports = monitoring;

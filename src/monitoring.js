const bluebird = require("bluebird");
const redis = require("redis");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient();

/**
 * Manage and dispatch all logs
 * @constructor
 */
const monitoring = {
  log: {
    error: [],
    warning: [],
    info: []
  },
  workersError: []
};
/**
 * Send a log in redis
 * @param {String} type Type of the log (info, warning, etc...)
 * @param {String} string Description of the log
 */
monitoring.updateLog = async function(type, string) {
  if (
    string.hasOwnProperty('message') &&
    string.hasOwnProperty('stack') ||
    type === 'error'
  ) return this.updateError(string);
  this.log[type].push(string);
  await client.hsetAsync(
    "monitoring",
    "log",JSON.stringify(this.log)
  );
};

/**
 * Format and send an error log in redis
 * @param {String|Object} err Error to send in redis
 */
monitoring.updateError = async function(err) {
  const redisError = {
    message: 'Unknown error',
    stack: '',
    infos: 'No information',
    time: Date.now()
  };
  if (err.hasOwnProperty('message')) redisError.message = err.message;
  if (err.hasOwnProperty("infos")) redisError.infos = err.infos;
  if (err.hasOwnProperty("stack")) redisError.stack = err.stack;
  if (typeof err === 'string') redisError.message = err;

  if (err.hasOwnProperty("infos") && err.infos.hasOwnProperty("path")) this.workersError.push(redisError);
  this.log["error"].push(redisError);

  await client.hmsetAsync(
    "monitoring",
    "log", JSON.stringify(this.log),
    "workersError", JSON.stringify(this.workersError)
  );
};

module.exports = monitoring;

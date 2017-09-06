const Queue = require('bull');

/**
 * @constructor
 */
const Task = {};

/**
 * Init all queue for redis
 * @param {Object} options  Options for redis
 * @param {Object} options.name  Name of the redis queue
 * @param {Object} options.stringRedisConnection  Url to redis
 * @return {Task}
 */
Task.init = function (options) {
  this.name = options.name;
  if (options.hasOwnProperty('stringRedisConnection')) {
    this.queue = new Queue(options.name, options.stringRedisConnection);
  } else {
    this.queue = new Queue(options.name);
  }
  return this;
};

/**
 * Add a task in redis
 * @param {Object} obj Object representing a task
 * @return {Promise}
 */
Task.add = function (obj) {
  return this.queue.add(obj, {removeOnComplete: true});
};

/**
 * Process all tasks in redis
 * @param  {callback} functionProcess Callback to get job
 */
Task.process = function (functionProcess) {
  this.queue.process(functionProcess);
};

/**
 * Get number of waiting, failed and completed tasks from redis
 * @returns Promise
 */
Task.getJobCounts = function () {
  return this.queue.getJobCounts();
};


/**
 * Bind event on queue
 * @return {Queue}  Bull queue
 */
Task.on = function () {
  return this.queue.on.call(this.queue, ...arguments);
};

module.exports = Task;

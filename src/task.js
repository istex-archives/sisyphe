const Queue = require('bull');
/**
 * Interface between Sisyphe and Redis server
 * @constructor
 */
const Task = {};

/**
 * @param {any} options
 * @returns Task
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
 * @param {any} obj
 * @returns Promise
 */
Task.add = function (obj) {
  return this.queue.add(obj, {removeOnComplete: true, attempts: 5});
};

Task.process = async function (fun, queue) {
  return this.queue.process(fun);
};
Task.pause = async function () {
  return this.queue.pause();
};

Task.getWaiting = async function () {
  return this.queue.getWaiting();
};

Task.resume = async function () {
  return this.queue.resume();
};

/**
 * @returns Promise
 */
Task.getJobCounts = function () {
  return this.queue.getJobCounts();
};

/**
 * @returns Promise
 */
Task.exit = function () {
  this.queue.removeAllListeners();
  return this.queue.close();
};

Task.on = function () {
  return this.queue.on.call(this.queue, ...arguments);
};

module.exports = Task;

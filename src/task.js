const Queue = require('bull');
const Task = {};

/**
 * @param {any} options
 * @returns Task
 */
Task.init = async function (options) {
  this.name = options.name;
  if (options.hasOwnProperty('stringRedisConnection')) {
    this.queue = new Queue(options.name, options.stringRedisConnection);
  } else {
    this.queue = new Queue(options.name);
  }
  
  //init all queue in redis
  await this.queue.add({init:true},{jobId:'init-'+options.name})
  const job = await this.queue.getJob('init-'+options.name)
  await job.remove()

  return this;
};

/**
 * @param {any} obj
 * @returns Promise
 */
Task.add = function (obj) {
  return this.queue.add(obj, {removeOnComplete: true});
};

Task.process = function (functionProcess) {
  this.queue.process(functionProcess);
};

/**
 * @returns Promise
 */
Task.getJobCounts = function () {
  return this.queue.getJobCounts();
};

Task.on = function () {
  return this.queue.on.call(this.queue, ...arguments);
};

module.exports = Task;

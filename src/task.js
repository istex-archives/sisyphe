const Queue = require('bull');
const Task = {};

Task.init = function (options) {
  this.name = options.name;
  this.queue = new Queue(options.name);
};

Task.process = function (functionProcess) {
  this.queue.process(functionProcess);
};

Task.add = function (obj) {
  return this.queue.add(obj);
};

Task.getJobCounts = function () {
  return this.queue.getJobCounts();
};

Task.on = function () {
  return this.queue.on.call(this.queue, ...arguments);
};

module.exports = Task;

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
  return this.queue.getJobCounts()
}

module.exports = Task;

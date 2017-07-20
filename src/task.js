const kue = require('kue');
const Task = {};

Task.init = function (options) {
  this.name = options.name;
  this.queue = kue.createQueue();
};

Task.process = function (funProcessing) {
  this.queue.process(this.name, funProcessing);
};

Task.add = function (obj, done) {
  let funError = null;
  if (arguments.length > 1) {
    funError = (error) => {
      error ? done(error) : done();
    };
  }
  this.queue.create(this.name, obj)
    .removeOnComplete(true)
    .save(funError);
};

module.exports = Task;

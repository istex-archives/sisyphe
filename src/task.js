const kue = require('kue')
const Task = {};

Task.init = function (options) {
  this.name = options.name;
  this.queue = kue.createQueue();
}

Task.process = function (funProcessing) {
  this.queue.process(this.name, funProcessing);
};

Task.add = function (obj, done) {
  this.queue.create(this.name, obj)
    .removeOnComplete(true)
    .save((error) => {
      error ? done(error) : done();
    })
}
module.exports = Task
const debounce = require('lodash').debounce;

const Dispatcher = {};

Dispatcher.init = function (task, options) {
  this.waitingQueue = [];
  this.tasks = task;
  this.options = options;
};

Dispatcher.addOverseer = function (overseer) {
  this.waitingQueue.push(overseer);
};
Dispatcher.getOverseer = function (done) {
  if (this.waitingQueue.length !== 0) return done(this.waitingQueue.shift());

  const checkOverseerIsAvailable = setInterval(() => {
    if (this.waitingQueue.length !== 0) {
      clearInterval(checkOverseerIsAvailable);
      done(this.waitingQueue.shift());
    }
  }, 10);
};

Dispatcher.start = function (end) {
  const debouncedCount = debounce(() => {
    this.tasks.queue.inactiveCount((error, totalInactive) => {
      this.tasks.queue.activeCount((error, totalActive) => {
        if (totalActive + totalInactive === 0) end();
      });
    });
  }, 500);

  this.tasks.process((job, done) => {
    this.getOverseer((overseer) => {
      overseer.send(job.data);
      overseer.once("message", (msg) => {
        if (msg.isDone) {
          this.addOverseer(overseer);
          debouncedCount();
          done();
        }
      });
    });
  });
};

module.exports = Dispatcher;

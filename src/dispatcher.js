const Dispatcher = {}

Dispatcher.init = function (task, options) {
  this.waitingQueue = [];
  this.tasks = task;
  this.options = options;
}

Dispatcher.addWorker = function(worker) {
  this.waitingQueue.push(worker);
}
Dispatcher.getWorker = function (done) {
  if (this.waitingQueue.length !== 0) return done(this.waitingQueue.shift());

  const checkWorkerIsAvailable = setInterval(() => {
    if (this.waitingQueue.length !== 0) {
      clearInterval(checkWorkerIsAvailable);
      done(this.waitingQueue.shift());
    }
  }, 10);
}

Dispatcher.start = function () {
  this.tasks.process("which key ?", (job, done) => {
    this.getWorker((worker) => {
      worker.send({
        push: true,
        job: data
      });
      done();
    })
  })
}

module.exports = Dispatcher
const Dispatcher = {}

Dispatcher.init = function (queue, options) {
  this.waitingQueue = [];
  this.tasks = queue;
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
  this.tasks.process((job, done) => {
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
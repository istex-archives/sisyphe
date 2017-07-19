const Dispatcher = {}

Dispatcher.init = function (task, options) {
  this.waitingQueue = [];
  this.tasks = task;
  this.options = options;
}

Dispatcher.addOverseer = function(overseer) {
  this.waitingQueue.push(overseer);
}
Dispatcher.getOverseer = function (done) {
  if (this.waitingQueue.length !== 0) return done(this.waitingQueue.shift());

  const checkOverseerIsAvailable = setInterval(() => {
    if (this.waitingQueue.length !== 0) {
      clearInterval(checkOverseerIsAvailable);
      done(this.waitingQueue.shift());
    }
  }, 10);
}

Dispatcher.start = function () {
  this.tasks.process((job, done) => {
    this.getOverseer((overseer) => {
      overseer.send({
        push: true,
        job: data
      });
      overseer.on("message", (msg) => {

      })
      done();
    })
  })
}

module.exports = Dispatcher
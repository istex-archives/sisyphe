const dumbWorker = {};

dumbWorker.init = function (options = {id: 123456}) {
  this.id = options.id;
  this.time = ~~(Math.random() * 100);
  return this;
};

dumbWorker.doTheJob = function (data, done) {
  setTimeout(() => {
    data.id = this.id;
    done(null, data);
  }, this.time);
};

dumbWorker.finalJob = function (done) {
  setTimeout(done, this.time);
};

module.exports = dumbWorker;

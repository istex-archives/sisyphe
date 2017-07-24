const dumbWorker = {};

dumbWorker.init = function () {
  this.time = ~~(Math.random() * 100);
  return this;
};

dumbWorker.doTheJob = function (data, done) {
  setTimeout(() => {
    done(null, data);
  }, this.time);
};

module.exports = dumbWorker;

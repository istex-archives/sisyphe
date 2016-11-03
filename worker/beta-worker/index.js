'use strict';

const betaWorker = {};
betaWorker.doTheJob = function (data, next) {
  setTimeout(() => {
    if (data.extension === '.xml') {
      next(new Error("I don't want yours metadata, dude !"));
    } else {
      next()
    }
  }, 50);
  // Math.floor(Math.random() * 80 + 20)
};
betaWorker.finalJob = function (done) {
  setTimeout(() => {
    console.log('this is the final countdown');
    done()
  }, Math.floor(Math.random() * 80 + 20))
};
module.exports = betaWorker;
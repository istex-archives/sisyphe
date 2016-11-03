'use strict';

const alphaWorker = {};
alphaWorker.doTheJob = function (data, next) {
  setTimeout(() => {
    if (data.extension === '.TIF') {
      next(new Error("I don't want yours TIF, dude !"));
    } else {
      next();
    }
  }, 40);
};

module.exports = alphaWorker;
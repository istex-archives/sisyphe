'use strict';

const alphaWorker = {};
alphaWorker.doTheJob = function(data, next) {
  setTimeout(() => {
    process.stdout.write('.');
    next();
  }, 40);
};

module.exports = alphaWorker;
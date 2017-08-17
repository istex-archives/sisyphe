'use strict';

const sisypheOut = {};
const Winston = require('winston');

sisypheOut.init = function (options) {
  this.now = options.hasOwnProperty('now') ? new Date(options.now) : new Date();
  this.corpusname = options.hasOwnProperty('corpusname') ? options.corpusname : 'default';
  this.fileLog = `logs/analyse-${this.corpusname}-${this.now.toISOString()}.log`;
  this.logger = new Winston.Logger();
  this.logger.configure({
    exitOnError: false,
    transports: [
      new Winston.transports.File({
        filename: this.fileLog,
        highWaterMark: 24,
        json: true,
        level: 'debug'
      })
    ]
  });
  return this;
};

sisypheOut.doTheJob = function (data, next) {
  this.logger.info(data, function (error, level, msg, meta) {
    if (error) return next(error);
    next(null, msg);
  });
};

module.exports = sisypheOut;

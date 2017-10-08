'use strict';

const sisypheOut = {};
const Winston = require('winston');
const mkdirp = require('mkdirp');
process.on('exit', data=>{
  console.log('lkjjlklkjkjlkljkjlkjlk')
})
sisypheOut.init = function (options) {
  this.outputPath = options.outputPath || 'out/no-output-specified';
  mkdirp.sync(this.outputPath);
  this.now = options.hasOwnProperty('now') ? new Date(options.now) : new Date();
  this.corpusname = options.hasOwnProperty('corpusname') ? options.corpusname : 'default';
  this.fileLog = this.outputPath + `/analyse-${options.corpusname}.json`
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

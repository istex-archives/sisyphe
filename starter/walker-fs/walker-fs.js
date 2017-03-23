'use strict';

const walk = require('walk'),
  path = require('path'),
  bluebird = require('bluebird'),
  mkdirp = require('mkdirp'),
  fs = bluebird.promisifyAll(require('fs')),
  crypto = require('crypto'),
  mime = require('mime');

class WalkerFS {
  constructor(options) {
    this._path = options.path;
    this.corpusname = options.corpusname;
    this.totalFile = 0;
    this.now = Date.now();
    this.functionEventOnFile = (root, stats, next) => {
      const fileInfo = {
        corpusname: this.corpusname,
        startAt: this.now,
        extension: path.extname(stats.name),
        path: path.resolve(root, stats.name),
        name: stats.name,
        size: stats.size
      };
      next(fileInfo);
    };

    this.functionEventOnData = (data) => {
      console.log(data);
    };
  }

  setFunctionEventOnFile(functionEventOnFile) {
    this.functionEventOnFile = functionEventOnFile;
    return this;
  }

  setFunctionEventOnData(functionEventOnData) {
    this.functionEventOnData = functionEventOnData;
    return this;
  }

  setFunctionEventOnEnd(functionEventOnEnd) {
    this.functionEventOnEnd = functionEventOnEnd;
    return this;
  }

  start() {
    const walker = walk.walk(this._path);
    walker.on('file', (root, stats, next) => {
      this.functionEventOnFile(root, stats, (data) => {
        walker.emit('data', data);
        next()
      });
    });
    walker.on('data', (data) => {
      this.functionEventOnData(data);
    });
    walker.on('end', () => {
      this.functionEventOnEnd();
    });
  }
}

module.exports = WalkerFS;

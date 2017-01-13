'use strict';

const walk = require('walk'),
  path = require('path'),
  fs = require('fs'),
  mime = require('mime');

class WalkerFS {
  constructor(options) {
    this._path = options.path;
    this.corpusname = options.corpusname;
    // Use an init function should be better
    this.totalFile = 0;
    this.now = Date.now();
    this.functionEventOnFile = (root, stats) => {
      const data = {
        corpusname: this.corpusname,
        startAt: this.now,
        extension: path.extname(stats.name),
        path: path.resolve(root + '/' + stats.name),
        name: stats.name,
        size: stats.size
      };

      return data;
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
      const data = this.functionEventOnFile(root, stats);
      walker.emit('data', data);
      next()
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

'use strict';

const walk = require('walk'),
  mime = require('mime'),
  ChainJobQueue = require('./../../src/chain-job-queue');

class WalkerFS {
  constructor(path) {
    this._path = path;
    this.totalFile = 0;
  }

  addFunctionEventOnFile(functionEventOnFile) {
    this.functionEventOnFile = functionEventOnFile;
    return this;
  }

  addFunctionEventOnEnd(functionEventOnEnd) {
    this.functionEventOnEnd = functionEventOnEnd;
    return this;
  }

  start() {
    const walker = walk.walk(this._path);
    walker.on('file', this.functionEventOnFile);
    walker.on('end', this.functionEventOnEnd);
  }
}

module.exports = WalkerFS;

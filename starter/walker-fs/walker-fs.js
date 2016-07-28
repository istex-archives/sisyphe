'use strict';

const walk = require('walk');

class WalkerFS {
  constructor(path) {
    this._path = path;
    this.totalFile = 0;
    this.functionEventOnFile = [];
    this.functionEventOnEnd = [];
  }

  addFunctionEventOnFile(functionEventOnFile) {
    this.functionEventOnFile.push(functionEventOnFile);
    return this;
  }

  addFunctionEventOnEnd(functionEventOnEnd) {
    this.functionEventOnEnd.push(functionEventOnEnd);
    return this;
  }

  start() {
    const walker = walk.walk(this._path);
    walker.on('file', (root, stats, next) => {
      this.functionEventOnFile.map((functionEventOnFile) => functionEventOnFile(root, stats, next));
    });
    walker.on('end', () => {
      this.functionEventOnEnd.map((functionEventOnEnd) => functionEventOnEnd());
    });
  }
}

module.exports = WalkerFS;

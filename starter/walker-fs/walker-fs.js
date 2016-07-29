'use strict';

const walk = require('walk'),
  path = require('path'),
  mime = require('mime');

class WalkerFS {
  constructor(pathInput) {
    this._path = pathInput;
    this.totalFile = 0;

    this.functionEventOnFile = (root, stats) => {
      return {
        path: root + '/' + stats.name,
        mimetype: mime.lookup(root + '/' + stats.name),
        count: 0
      };
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

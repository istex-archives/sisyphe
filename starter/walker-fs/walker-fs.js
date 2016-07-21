'use strict';

const walk = require('walk'),
  mime = require('mime'),
  ChainJobQueue = require('./../../src/chain-job-queue');

class WalkerFS {
  constructor(path) {
    this._path = path;
    this.totalFile = 0;
  }

  addChain(chain) {
    this.functionEventOnFile = (root, stats, next) => {
      this.totalFile++;
      const item = {};
      item.path = root + '/' + stats.name;
      item.mimetype = mime.lookup(root + '/' + stats.name);
      item.count = 0;
      // console.log(JSON.stringify(item));
      if (chain && chain instanceof ChainJobQueue) {
        chain.addTask(item);
      }
      next();
    };
    this.functionEventOnEnd = () => {
      // chain.stopAll();
      chain.numberTotalTask = this.totalFile;
      console.log('walker finish with ' + this.totalFile + ' files.')
    };
    return this;
  }

  start() {
    const walker = walk.walk(this._path);
    walker.on('file', this.functionEventOnFile);
    walker.on('end', this.functionEventOnEnd);
  }
}

module.exports = WalkerFS;

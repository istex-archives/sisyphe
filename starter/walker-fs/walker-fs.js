'use strict';

const walk = require('walk'),
  mime = require('mime');

class WalkerFS {
  constructor(path) {
    this.path = path;
  }

  addChain(chain) {
    this.functionEventOnFile = (root, stats, next) => {
      const item = {};
      item.path = root + '/' + stats.name;
      item.mimetype = mime.lookup(root + '/' + stats.name);
      item.count = 0;
      console.log(JSON.stringify(item));
      if (chain && typeof chain === 'ChainJobQueue') {
        chain.addTask(item);
      }
      next();
    };
  }

  start() {
    const walker = walk.walk(this.path);
    walker.on('file', this.functionEventOnFile);
  }
}

module.exports = WalkerFS;

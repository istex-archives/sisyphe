'use strict';

const walk = require('walk'),
  path = require('path'),
  mime = require('mime');

class WalkerFS {
  constructor(pathInput) {
    this._path = pathInput;
    this.totalFile = 0;

    this.functionEventOnFile = (root, stats) => {
      // Permet d'identifier les fichiers .nxml (BMJ) et .Meta (Springer) comme mimetype XML
      mime.define({
        'application/xml': ["nxml", "meta", "xlink_v03", "prime_v03", "plusxml_v02", "plusprime_v02", "info_V03", "citation_v03", "aux_v03"]
      });
      const data = {
        extenstion: path.extname(stats.name),
        path: root + '/' + stats.name,
        mimetype: mime.lookup(root + '/' + stats.name),
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

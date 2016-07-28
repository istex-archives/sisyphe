'use strict';

const walk = require('walk'),
  path = require('path'),
  mime = require('mime');

class WalkerFS {
  constructor(pathInput) {
    this._path = pathInput;
    this.totalFile = 0;
    this.functionEventOnFile = [];
    this.functionEventOnEnd = [];

    this.addFunctionEventOnFile((root, stats) => {
      if (path.extname(stats.name) === '.xml') {
        const filenameXml = stats.name;
        const filenamePdf = transformFilenameXmlToPdf(filenameXml);
        const docObject = {
          metadata: [
            {
              path: root + '/' + filenameXml,
              mime: mime.lookup(root + '/' + filenameXml),
              original: true
            }
          ],
          fulltext: [
            {
              path: root + '/' + filenamePdf,
              mime: mime.lookup(root + '/' + filenamePdf),
              original: true
            }
          ]
        };
        console.log(docObject);
      }

      function transformFilenameXmlToPdf(filenameXml) {
        const basenameXml = path.basename(filenameXml, '.xml');
        return basenameXml + '.pdf';
      }
    })
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
      this.functionEventOnFile.map((functionEventOnFile) => functionEventOnFile(root, stats));
      next()
    });
    walker.on('end', () => {
      this.functionEventOnEnd.map((functionEventOnEnd) => functionEventOnEnd());
    });
  }
}

module.exports = WalkerFS;

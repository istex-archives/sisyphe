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
    // prepare the checksum outputDir
    fs.mkdirSync('checksum');
    this.checksum = fs.createWriteStream(`checksum/${this.corpusname}-${this.now}.csv`);
    this.functionEventOnFile = (root, stats, next) => {
      const fileInfo = {
        corpusname: this.corpusname,
        startAt: this.now,
        extension: path.extname(stats.name),
        path: path.resolve(root, stats.name),
        name: stats.name,
        size: stats.size
      };

      fs.accessAsync(fileInfo.path, fs.constants.R_OK).then(() => {
        const hash = crypto.createHash('md5');
        const LARGE_FILE_LIMIT = 1000000;
        if (stats.size > LARGE_FILE_LIMIT) {
          const input = fs.createReadStream(fileInfo.path);
          input.on('readable', () => {
            const data = input.read();
            if (data)
              hash.update(data);
            else {
              fileInfo.hash = hash.digest('hex');
              this.checksum.write(`"${fileInfo.path}";"${fileInfo.hash}"\n`);
              next(fileInfo)
            }
          })
        } else {
          fs.readFileAsync(fileInfo.path).then((data) => {
            fileInfo.hash = hash.update(data).digest('hex');
            this.checksum.write(`"${fileInfo.path}";"${fileInfo.hash}"\n`);
            next(fileInfo)
          })
        }
      }).catch(() => {
        next(fileInfo)
      });
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

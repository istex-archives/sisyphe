'use strict';

const bluebird = require('bluebird'),
  fs = bluebird.promisifyAll(require('fs')),
  crypto = require('crypto');

const sisypheHash = {};

sisypheHash.init = function (options) {
  this.now = Date.now();
  this.checksum = fs.createWriteStream(`checksum/${options.corpusname}-${this.now}.csv`);
  return this;
};

sisypheHash.doTheJob = function (docObject, next) {
  // prepare the checksum outputDir
  const isChecksumDirectoryExist = fs.existsSync('checksum');
  if (!isChecksumDirectoryExist) fs.mkdirSync('checksum');

  fs.accessAsync(docObject.path, fs.constants.R_OK).then(() => {
    const LARGE_FILE_LIMIT = 1000000;
    if (docObject.size > LARGE_FILE_LIMIT) {
      return this.generateHashFromABigFile(docObject.path)
    } else {
      return this.generateHashFromASmallFile(docObject.path)
    }
  }).then((hash) => {
    docObject.hash = hash;
    this.checksum.write(`"${docObject.path}";"${docObject.hash}"\n`);
    next(null, docObject)
  }).catch((error) => {
    docObject.error = JSON.stringify(error);
    next(null, docObject)
  });
};


sisypheHash.generateHashFromABigFile = function(pathToBigFile) {
  const hashGenerator = crypto.createHash('md5');
  return new Promise((resolve, reject) => {
    let error = [];
    const input = fs.createReadStream(pathToBigFile);
    input.on('error', (errorStream) => {
      error.push(errorStream)
    });
    input.on('data', (chunk) => {
      hashGenerator.update(chunk);
    });
    input.on('end', () => {
      if (error.length === 0) {
        const hash = hashGenerator.digest('hex');
        resolve(hash)
      } else {
       reject(error)
      }
    });
  })
};

sisypheHash.generateHashFromASmallFile = function(pathToSmallFile) {
  const hashGenerator = crypto.createHash('md5');
  return fs.readFileAsync(pathToSmallFile).then((buffer) => {
    return hashGenerator.update(buffer).digest('hex');
  });
};

module.exports = sisypheHash;
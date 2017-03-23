'use strict';

const bluebird = require('bluebird'),
  path = require('path'),
  fs = bluebird.promisifyAll(require('fs')),
  crypto = require('crypto');

const sisypheHash = {};

sisypheHash.doTheJob = function (docObject, next) {
  // prepare the checksum outputDir
  const pathChecksumDir = path.resolve(__dirname, '../..', 'checksum');
  const isChecksumDirectoryExist = fs.existsSync(pathChecksumDir);
  if (!isChecksumDirectoryExist) fs.mkdirSync(pathChecksumDir);

  fs.accessAsync(docObject.path, fs.constants.R_OK).then(() => {
    const LARGE_FILE_LIMIT = 1000000;
    if (docObject.size > LARGE_FILE_LIMIT) {
      return this.generateHashFromABigFile(docObject.path)
    } else {
      return this.generateHashFromASmallFile(docObject.path)
    }
  }).then((hash) => {
    docObject.hash = hash;
    const pathFileHash = path.resolve(__dirname, '../..', `checksum/${docObject.corpusname}-${docObject.startAt}.csv`);
    return fs.appendFileAsync(pathFileHash, `"${docObject.path}";"${docObject.hash}"\n`);
  }).then(() => {
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
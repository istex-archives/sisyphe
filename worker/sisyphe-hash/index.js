'use strict';

const bluebird = require('bluebird'),
  path = require('path'),
  fs = bluebird.promisifyAll(require('fs')),
  colors = require('ansicolors'),
  crypto = require('crypto');

const sisypheHash = {};

sisypheHash.init = function (options) {
  this.isInspected = options.isInspected || false;
};

sisypheHash.doTheJob = function (data, next) {

  if(this.isInspected){
    console.log(`${colors.magenta('hash')}: ${data.name}`);
  }

  // prepare the checksum outputDir
  const pathChecksumDir = path.resolve(__dirname, '../..', 'checksum');
  const isChecksumDirectoryExist = fs.existsSync(pathChecksumDir);
  if (!isChecksumDirectoryExist) fs.mkdirSync(pathChecksumDir);

  fs.accessAsync(data.path, fs.constants.R_OK).then(() => {
    const LARGE_FILE_LIMIT = 1000000;
    if (data.size > LARGE_FILE_LIMIT) {
      return this.generateHashFromABigFile(data.path)
    } else {
      return this.generateHashFromASmallFile(data.path)
    }
  }).then((hash) => {
    data.hash = hash;
    const pathFileHash = path.resolve(__dirname, '../..', `checksum/${data.corpusname}-${data.startAt}.csv`);
    return fs.appendFileAsync(pathFileHash, `"${data.path}";"${data.hash}"\n`);
  }).then(() => {
    next(null, data);
  }).catch((error) => {
    data.error = JSON.stringify(error);
    next(null, data);
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
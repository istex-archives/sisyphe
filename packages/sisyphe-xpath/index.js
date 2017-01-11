'use strict';

const redisHost = process.env.REDIS_HOST || 'localhost',
  redisPort = process.env.REDIS_PORT || '6379';

const config = require('./config.json'),
  FromXml = require('xpath-generator').FromXml,
  Promise = require('bluebird'),
  redis = Promise.promisifyAll(require('redis')),
  fs = Promise.promisifyAll(require('fs')),
  path = require('path'),
  mkdirp = Promise.promisifyAll(require('mkdirp'));

config.xpathsOutput = config.xpathsOutput || '/applis/istex/job/';
config.redisDB = config.redisDB || config.redisDB;

const redisClient = redis.createClient(`//${redisHost}:${redisPort}`, {db: config.redisDB});

const sisypheXpath = {},
  xml = new FromXml();

const fullXpaths = new Set();

sisypheXpath.doTheJob = function (data, next) {
  if (data.mimetype !== 'application/xml' || !data.isWellFormed) {
    return next(null, data);
  }
  xml.generate(data.path, true).then(result => {
    data.xpath = result;
    let keys = Object.keys(result);
    for (let i = 0; i < keys.length; i++) {
      redisClient.incrby(keys[i], result[keys[i]].count);
    }
    return next(null, data);
  }).catch(err => {
    return next(err);
  })
};

sisypheXpath.finalJob = function (done) {
  // When no more data in queue, sisyphe will execute it
  let outputPath = path.resolve(config.xpathsOutput, Date.now().toString()),
    outputFile = path.resolve(outputPath, 'xpaths-list.txt');

  mkdirp.mkdirpAsync(outputPath).then(() => {
    let xpathsStream = fs.createWriteStream(outputFile);
    xpathsStream.on('error', (err) => {
      return done(err);
    });
    xpathsStream.on('open', () => {
      scanAsync('0', '*').map((result) => {
        return xpathsStream.writeAsync(`${result.key} ${result.val}\n`);
      }).then(() => {
        xpathsStream.close();
        done();
      }).catch(err => {
        done(err)
      })
    });
    xpathsStream.on('close', () => {
      redisClient.flushdb();
    })
  }).catch(err => {
    return done(err);
  });
};

function scanAsync(cursor, pattern) {
  return redisClient.scanAsync(cursor, 'MATCH', pattern).then(reply => {
    cursor = +reply[0];
    for (let i = 0; i < reply[1].length; i++) {
      fullXpaths.add(reply[1][i]);
    }
    if (cursor !== 0) return scanAsync(cursor, '*');
    return Promise.map(fullXpaths, (key) => {
      return redisClient.getAsync(key).then(value => {
        return {key: key, val: value}
      });
    })
  });
}

module.exports = sisypheXpath;
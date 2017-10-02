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

const sisypheXpath = {},
  xml = new FromXml();

var redisClient;

sisypheXpath.init = function (options = { corpusname: 'default' }) {
  this.options = options;
  this.outputPath = options.outputPath || path.resolve('out', 'no-output-specified');
  this.isInspected = (options && options.isInspected) || false;
  config.debug = config.hasOwnProperty('debug') ? config.debug : false;
  config.redisDB = config.redisDB || 1;

  redisClient = redis.createClient(`//${redisHost}:${redisPort}`, { db: config.redisDB });
  redisClient.on('error', function (error) {
    process.send({ error, id: process.env.WORKER_ID, module: options.name });
  });
};

sisypheXpath.doTheJob = function (data, next) {
  if (data.mimetype !== 'application/xml' || !data.isWellFormed) {
    return next(null, data);
  }

  xml
    .generate(data.path, true)
    .then(result => {
      if (data.debug === true) data.xpath = result;
      let keys = Object.keys(result);
      for (let i = 0; i < keys.length; i++) {
        redisClient.hincrby(keys[i], 'countElement', result[keys[i]].countElement);
        // Set attributes in hash key
        let attributesRedis = [];
        for (var attr in result[keys[i]].attributes) {
          attributesRedis.push(attr);
          attributesRedis.push(result[keys[i]].attributes[attr].toString());
        }
        if (attributesRedis.length) {
          redisClient.hmset(keys[i], attributesRedis);
        }
      }
      return next(null, data);
    })
    .catch(err => {
      return next(err, data);
    });
};

sisypheXpath.finalJob = function (done) {
  // This function return the value for all redis xpaths keys
  function scanAsync (cursor, pattern) {
    return redisClient.scanAsync(cursor, 'MATCH', pattern).then(reply => {
      cursor = +reply[0];
      for (let i = 0; i < reply[1].length; i++) {
        fullXpaths.add(reply[1][i]);
      }
      if (cursor !== 0) return scanAsync(cursor, '*');
      return Promise.map(fullXpaths, key => {
        return redisClient.hgetallAsync(key).then(value => {
          let countElement = value.countElement;
          delete value.countElement;
          let attributes = Object.keys(value);
          return { key: key, countElement: countElement, attributes: attributes };
        });
      });
    });
  }

  let fullXpaths = new Set(),
    outputPath = path.join(this.outputPath, 'xpaths'),
    outputFile = path.join(outputPath, `xpaths.csv`);
  // When no more data in queue, sisyphe will execute it
  redisClient = redisClient || redis.createClient(`//${redisHost}:${redisPort}`, { db: config.redisDB });

  mkdirp
    .mkdirpAsync(outputPath)
    .then(() => {
      let xpathsStream = fs.createWriteStream(outputFile);
      xpathsStream.on('error', err => {
        return done(err);
      });
      xpathsStream.on('open', () => {
        scanAsync(0, '*')
          .map(result => {
            return xpathsStream.writeAsync(
              `${result.key};${result.countElement};${result.attributes.toString()}\n`
            );
          })
          .then(() => {
            xpathsStream.close();
            done();
          })
          .catch(err => {
            done(err);
          });
      });
      xpathsStream.on('close', () => {
        // redisClient.flushdb();
      });
    })
    .catch(err => {
      return done(err);
    });
};

module.exports = sisypheXpath;

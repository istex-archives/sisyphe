'use strict';

const redisHost = process.env.REDIS_HOST || 'localhost',
  redisPort = process.env.REDIS_PORT || '6379';

const FromXml = require('/Users/dieudonn/Documents/INIST/xpath-generator').FromXml,
  // FromXml = require('xpath-generator').FromXml,
  redis = require('redis'),
  redisClient = redis.createClient(`//${redisHost}:${redisPort}`);


const sisypheXpath = {};

sisypheXpath.doTheJob = function (data, next) {
  if (data.mimetype != 'application/xml') {
    return next(null, data);
  }
  const xml = new FromXml();
  xml.generate(data.path, true).then(result => {
    data.xpath = result;
    next(null, data);
  }).catch(err => {
    next(err);
  })
};

sisypheXpath.finalJob = function () {
  // When no more data in queue, sisyphe will execute it
};

module.exports = sisypheXpath;
'use strict';

const redisHost = process.env.REDIS_HOST || 'localhost',
  redisPort = process.env.REDIS_PORT || '6379';

const FromXml = require('xpath-generator').FromXml,
  redis = require('redis'),
  redisClient = redis.createClient(`//${redisHost}:${redisPort}`);


const sisypheXpath = {};

sisypheXpath.doTheJob = function (data, next) {
  if (data.mimeType != 'application/xml') {
    return next(null, data);
  }
  const xml = new FromXml();
  xml.generate('./test.xml', true).then((result) => {
    data.xpaths = result;
    next(null, data);
  })
};

sisypheXpath.finalJob = function () {
  // When no more data in queue, sisyphe will execute it
};

module.exports = sisypheXpath;
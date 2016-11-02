'use strict';

const redisHost = process.env.REDIS_HOST || 'localhost',
  redisPort = process.env.REDIS_PORT || '6379';

const FromXml = require('/Users/dieudonn/Documents/INIST/xpath-generator').FromXml,
  // FromXml = require('xpath-generator').FromXml,
  redis = require('redis'),
  redisClient = redis.createClient(`//${redisHost}:${redisPort}`,{db : '1', prefix : 'sisyphe-xpath'});

const sisypheXpath = {},
  xml = new FromXml();

sisypheXpath.doTheJob = function (data, next) {
  if (data.mimetype != 'application/xml') {
    return next(null, data);
  }
  xml.generate(data.path, true).then(result => {
    data.xpath = result;
    let keys = Object.keys(result);
    for(var i=0; i < keys.length; i++){
      redisClient.incrby(keys[i],result[keys[i]].count);
    }
    next(null, data);
  }).catch(err => {
    next(err);
  })
};

sisypheXpath.finalJob = function () {
  // When no more data in queue, sisyphe will execute it
};

module.exports = sisypheXpath;
'use strict';

const redisHost = process.env.REDIS_HOST || 'localhost',
  redisPort = process.env.REDIS_PORT || '6379';

const FromXml = require('/Users/dieudonn/Documents/INIST/xpath-generator').FromXml,
  // FromXml = require('xpath-generator').FromXml,
  bluebird = require('bluebird'),
  redis = bluebird.promisifyAll(require('redis')),
  redisClient = redis.createClient(`//${redisHost}:${redisPort}`,{db : '0'}),
  redisScan = require('redisscan');

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
  let myResults = new Set();
  scanAsync('0', "*", myResults).map(myResults => { 
    //console.log( myResults); 
  });
};

function scanAsync(cursor, pattern, returnSet){
  return redisClient.scanAsync(cursor, "MATCH", pattern, "COUNT", "100").then(reply => {
    //console.log(reply)
    cursor = reply[0];
    var keys = reply[1];
    keys.forEach(function(key,i){
      redisClient.getAsync(key).then(function(res) {
          console.log(res); 
      });
      returnSet.add(key);
    });
    if( cursor === '0' ){
      return Array.from(returnSet);
    }else{
      return scanAsync(cursor, pattern, returnSet)
    }
  });
}

module.exports = sisypheXpath;
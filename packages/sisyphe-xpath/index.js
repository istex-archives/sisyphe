'use strict';

const redisHost = process.env.REDIS_HOST || 'localhost',
  redisPort = process.env.REDIS_PORT || '6379';

const FromXml = require('/Users/dieudonn/Documents/INIST/xpath-generator').FromXml,
  // FromXml = require('xpath-generator').FromXml,
  Promise = require('bluebird'),
  redis = Promise.promisifyAll(require('redis')),
  fs = Promise.promisifyAll(require('fs')),
  mkdirp = Promise.promisifyAll(require('mkdirp')),
  redisClient = redis.createClient(`//${redisHost}:${redisPort}`,{db : '1'}),
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

sisypheXpath.finalJob = function (done) {
  // When no more data in queue, sisyphe will execute it
  mkdirp(`applis/istex/job/${Date.now()}`).then(()=>{
    console.log('test')
  })
  .catch(err=>{
    return done(err);
  })
  let xpathsStream = fs.createWriteStream(`/applis/istex/job/${Date.now()}/xpaths.txt`, {'flags': 'w'});
  xpathsStream.on('error', function(err) {
    return done(err);
  });
  scanAsync('0', '*').then((result)=>{
    xpathsStream.write(result.toString());
    console.log('result ',result)
    done();
  });
};

function scanAsync(cursor, pattern){
  return redisClient.scanAsync(cursor, 'MATCH', pattern).then(reply => {
    cursor = reply[0];
    let keys = reply[1],
        obj = {};

    return Promise.map(keys,(key)=>{
      return redisClient.getAsync(key);
    }).then((results)=>{
      for (var i = 0; i < keys.length; i++) {
        obj[keys[i]] = results[i]
      }
      return obj;
    })

    //console.log([keys])
    //console.log(reply)
    // keys.forEach(function(key,i){
    //   redisClient.getAsync(key).then(function(val) {
    //     obj[key] = val;
    //   });
    // });
    // redisClient.mgetAsync(keys).then(function(res) {
    //   console.log(res); // => 'bar' 
    // });
  });
}

module.exports = sisypheXpath;
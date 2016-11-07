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

var fullXpaths = {};

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
  let date = Date.now();
  mkdirp.mkdirpAsync(`applis/istex/job/${date}`).then(()=>{
    let xpathsStream = fs.createWriteStream(`applis/istex/job/${date}/xpaths-list.txt`);
    xpathsStream
    .on('error', (err) =>{
      return done(err);
    })
    .on('open', ()=>{
      scanAsync('0', '*')
      .map((value,index)=>{
        return xpathsStream.writeAsync(`${fullXpaths[index]} ${value}\n`);
      })
      .then(()=>{
        xpathsStream.close();
        done();
      }).catch(err=>{
        done(err)
      })
    })
    .on('close', ()=>{
      redisClient.flushdb();
    })
  })
  .catch(err=>{
    return done(err);
  });
};

function scanAsync(cursor, pattern){
  return redisClient.scanAsync(cursor, 'MATCH', pattern).then(reply => {
    cursor = reply[0];
    fullXpaths = reply[1];

    return Promise.map(fullXpaths,(key)=>{
      return redisClient.getAsync(key);
    })
    // .then((results)=>{
    //   for (var i = 0; i < keys.length; i++) {
    //     fullPaths[keys[i]] = results[i]
    //   }
    // })
  });
}

module.exports = sisypheXpath;
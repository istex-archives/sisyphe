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

const redisClient = redis.createClient(`//${redisHost}:${redisPort}`,{db : config.redisDB});

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
  let outPutPath = path.resolve(config.xpathsOutput,Date.now().toString()),
      outputFile = path.resolve(outPutPath,'xpaths-list.txt');

  mkdirp.mkdirpAsync(outPutPath).then(()=>{
    let xpathsStream = fs.createWriteStream(outputFile);
    xpathsStream
    .on('error', (err) =>{
      return done(err);
    })
    .on('open', ()=>{
      scanAsync('0', '*').map((value,index)=>{
        return xpathsStream.writeAsync(`${fullXpaths[index]} ${value}\n`);
      }).then(()=>{
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
  });
}

module.exports = sisypheXpath;
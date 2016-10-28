'use strict';

const redisHost = process.env.REDIS_HOST || 'localhost',
      redisPort = process.env.REDIS_PORT || '6379';

const FromXml = require('xpath-generator').FromXml,
      redis = require('redis'),
      redisClient = redis.createClient(`//${redisHost}:${redisPort}`);


function doTheJob(data,next) {
  if(data.mimeType != 'application/xml'){
    return next(null,data);
  };
  let xml = new FromXml().generate('./test.xml',true).then(result=>{
    data.xpaths = result;
    next(null,data);
  })
}

function finalJob(){
  // When no more data in queue, sisyphe will execute it
}

exports.doTheJob = doTheJob;
exports.finalJob = finalJob;
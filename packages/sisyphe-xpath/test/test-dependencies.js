const chai = require('chai'),
      kuler = require('kuler'),
      expect = chai.expect;

const redisHost = process.env.REDIS_HOST || 'localhost',
      redisPort = process.env.REDIS_PORT || '6379';

const FromXml = require('xpath-generator').FromXml,
      redis = require('redis');



describe('Redis', () => {
  it('Should have redis env placed' , (done)=>{
    if(!process.env.REDIS_HOST){
      console.warn(kuler('No REDIS_HOST env defined, so localhost is used', 'orange'));
    }
    if(!process.env.REDIS_PORT){
      console.warn(kuler('No REDIS_PORT env defined, so localhost is used','orange'));
    }
    done();
  })
  it('Should have a redis lauched to worked', (done)=> {
    let client = redis.createClient(`//${redisHost}:${redisPort}`)
    client.on('error',(err) =>{
      return done(err)
    });
    client.on('connect',()=>{
      done();
    })
  })
});

function createClient() {
  let client = redis.createClient(`//${redisHost}:${redisPort}`)
  client.on('error',(err) =>{
    consoel.log('err', err)
  });
}
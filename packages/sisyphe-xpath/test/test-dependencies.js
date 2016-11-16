const chai = require('chai'),
  kuler = require('kuler'),
  doTheJob = require('../index.js').doTheJob,
  finalJob = require('../index.js').finalJob,
  expect = chai.expect,
  FromXml = require('xpath-generator').FromXml,
  redis = require('redis');

const redisHost = process.env.REDIS_HOST || 'localhost',
  redisPort = process.env.REDIS_PORT || '6379',
  config = require('../config.json');

describe('Redis', () => {
  it('Should have redis env placed', (done) => {
    if (!process.env.REDIS_HOST) {
      console.warn(kuler('No REDIS_HOST env defined, so localhost is used', 'orange'));
    }
    if (!process.env.REDIS_PORT) {
      console.warn(kuler('No REDIS_PORT env defined, so localhost is used', 'orange'));
    }
    done();
  });

  it('Should have a redis lauched to worked', (done) => {
    let client = redis.createClient(`//${redisHost}:${redisPort}`);
    client.on('error', (err) => {
      return done(err)
    });
    client.on('connect', () => {
      done();
    })
  })
});

describe('DoTheJob', () => {
  it('Should not doing work if mimetype is not xml', (done) => {
    let objTest = {
      extension: '.xml',
      path: 'test/test.xxx',
      mimetype: 'application/xxx',
      size: 500
    };

    doTheJob(objTest, (err, data) => {
      if (err) {
        return done(err);
      }
      expect(data).to.deep.equal(objTest);
      done();
    })
  });

  it('Should not doing job if file does not exist', (done) => {
    let objTest = {
      extension: '.xml',
      path: 'test/test-nofile.xml',
      mimetype: 'application/xml',
      size: 500
    };

    doTheJob(objTest, (err, data) => {
      try {
        expect(function () {
          if (err && err.instanceof(Error)) {
            throw err
          }
        }).to.throw(Error);
      }
      catch (err) {
        return done(err)
      }
      done()
    })
  });

  it('Should generate xpath obj', (done) => {
    let objTest = {
      extension: '.xml',
      path: 'test/test.xml',
      mimetype: 'application/xml',
      size: 500
    };

    doTheJob(objTest, (err, data) => {
      if (err) {
        return done(err);
      }
      expect(data.xpath).to.exist;
      expect(data.xpath).to.be.an('object');
      expect(data.xpath).to.be.not.empty;
      expect(data.xpath[Object.keys(data.xpath)[0]]).to.have.property('count');
      return done();
    })
  })
});

describe('FinalJob', () => {
  it('Final Job should not failed during work', (done) => {
    finalJob((err) => {
      if (err) {
        return done(err)
      }
      done();
    })
  })
});
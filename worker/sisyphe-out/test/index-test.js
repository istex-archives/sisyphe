'use strict';

const chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  sisypheOut = require('../index.js');

describe('init', () => {
  it('should initialize the module', () => {
    const sisypheOutTest = Object.create(sisypheOut);
    sisypheOutTest.init({corpus: 'test'});
    expect(sisypheOutTest.init).to.be.a('function');
    expect(sisypheOutTest.doTheJob).to.be.a('function');
    expect(sisypheOutTest.client).to.be.an('object');
    expect(sisypheOutTest.redisClient).to.be.an('object');
    expect(sisypheOutTest.logger).to.be.an('object');
  });
});

describe('doTheJob', () => {
  it('should do the job for a doc object in create mode', () => {
    const sisypheOutTest = Object.create(sisypheOut);
    sisypheOutTest.init({corpus: 'test'});

    sinon.stub(sisypheOutTest.client, "update").resolves('done');
    sinon.stub(sisypheOutTest.redisClient, "getAsync").resolves(null);
    sinon.stub(sisypheOutTest.redisClient, "incr").callsFake((path) => {
      expect(path).to.be.equal('path/to/file')
    });
    sinon.stub(sisypheOutTest.logger, "info").callsFake((data) => {
      expect(data).to.be.an('object');
      expect(data).to.deep.equal({path: 'path/to/file'});
    });

    sisypheOutTest.doTheJob({path: 'path/to/file'}, (error, docOutput) => {
      expect(sisypheOutTest.redisClient.getAsync.called).to.be.true;
      expect(sisypheOutTest.client.update.called).to.be.false;
      expect(sisypheOutTest.redisClient.incr.called).to.be.true;
      expect(sisypheOutTest.logger.info.called).to.be.true;
      expect(error).to.be.null;
      expect(docOutput).to.deep.equal({path: 'path/to/file'});
    });
  });

  it('should do the job for a doc object in update mode', () => {
    const sisypheOutTest = Object.create(sisypheOut);
    sisypheOutTest.init({corpus: 'test'});

    sinon.stub(sisypheOutTest.client, "update").resolves('done');
    sinon.stub(sisypheOutTest.redisClient, "getAsync").resolves(null);
    sinon.stub(sisypheOutTest.redisClient, "incr").callsFake((path) => {
      expect(path).to.be.equal('path/to/file')
    });
    sinon.stub(sisypheOutTest.logger, "info").callsFake((data) => {
      expect(data).to.be.an('object');
      expect(data).to.deep.equal({path: 'path/to/file'});
    });

    const docInput = {
      path: 'path/to/file',
      updateEs: {
        _index: 'test-index',
        _type: 'test-index',
        _id: '1'
      }
    };
    sisypheOutTest.doTheJob(docInput, (error, docOutput) => {
      expect(sisypheOutTest.redisClient.getAsync.called).to.be.true;
      expect(sisypheOutTest.client.update.called).to.be.true;
      expect(sisypheOutTest.redisClient.incr.called).to.be.true;
      expect(sisypheOutTest.logger.info.called).to.be.false;
      expect(error).to.be.null;
      expect(docOutput).to.deep.equal(docInput);
    });
  });

  it('should skip job', () => {
    const sisypheOutTest = Object.create(sisypheOut);
    sisypheOutTest.init({corpus: 'test'});
    sinon.stub(sisypheOutTest.redisClient, "getAsync").resolves(1);
    sisypheOutTest.doTheJob({path: 'path/to/file'}, (error, docOutput) => {
      expect(sisypheOutTest.redisClient.getAsync.called).to.be.true;
      expect(error).to.be.null;
      expect(docOutput).to.deep.equal({path: 'path/to/file'});
    })
  })
});
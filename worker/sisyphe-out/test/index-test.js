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
    expect(sisypheOutTest.logger).to.be.an('object');
  });
});

describe('doTheJob', () => {
  it('should do the job for a doc object in create mode', () => {
    const sisypheOutTest = Object.create(sisypheOut);
    sisypheOutTest.init({corpus: 'test'});

    sinon.stub(sisypheOutTest.logger, "info").callsFake((data) => {
      expect(data).to.be.an('object');
      expect(data).to.deep.equal({path: 'path/to/file'});
    });

    sisypheOutTest.doTheJob({path: 'path/to/file'}, (error, docOutput) => {
      expect(sisypheOutTest.logger.info.called).to.be.true;
      expect(error).to.be.null;
      expect(docOutput).to.deep.equal({path: 'path/to/file'});
    });
  });

  it('should do the job for a doc object in update mode', () => {
    const sisypheOutTest = Object.create(sisypheOut);
    sisypheOutTest.init({corpus: 'test'});

    sinon.stub(sisypheOutTest.logger, "info").callsFake((data) => {
      expect(data).to.be.an('object');
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
      expect(error).to.be.null;
      expect(docOutput).to.deep.equal(docInput);
    });
  });

  it('should skip job', () => {
    const sisypheOutTest = Object.create(sisypheOut);
    sisypheOutTest.init({corpus: 'test'});
    sisypheOutTest.doTheJob({path: 'path/to/file'}, (error, docOutput) => {
      expect(error).to.be.null;
      expect(docOutput).to.deep.equal({path: 'path/to/file'});
    })
  })
});
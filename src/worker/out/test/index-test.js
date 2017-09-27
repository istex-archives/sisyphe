'use strict';

const fs = require('fs');
const path = require('path');
const chai = require('chai');
const expect = chai.expect;
const SisypheOut = require('../index.js');
const Winston = require('winston');

describe('init', () => {
  it('should initialize the module', () => {
    const sisypheOutTest = Object.create(SisypheOut);
    sisypheOutTest.init({ corpusname: 'test', now: 1502976129863 });
    expect(sisypheOutTest.init).to.be.a('function');
    expect(sisypheOutTest.doTheJob).to.be.a('function');
    expect(sisypheOutTest.logger).to.be.an.instanceOf(Winston.Logger);
    expect(sisypheOutTest.now).to.be.an.instanceOf(Date);
    expect(sisypheOutTest.corpusname).to.be.a('string');
    expect(sisypheOutTest.corpusname).to.be.equal('test');
    expect(sisypheOutTest.fileLog).to.be.a('string');
    expect(sisypheOutTest.fileLog).to.be.equal('logs/analyse-test-2017-08-17T13:22:09.863Z.json');
  });
});

describe('doTheJob', () => {
  it('should do the job for a doc object', () => {
    const sisypheOutTest = Object.create(SisypheOut);
    sisypheOutTest.init({ corpusname: 'test', now: 1502976129863 });

    sisypheOutTest.doTheJob({ path: 'path/to/file' }, (error, docOutput) => {
      expect(error).to.be.null;
      const fileToCheck = path.resolve(__dirname, './..', sisypheOutTest.fileLog);
      expect(fs.existsSync(fileToCheck)).to.be.true;
      expect(docOutput).to.deep.equal({ path: 'path/to/file' });
    });
  });
  after(() => {
    const fileToDelete = path.resolve(__dirname, '../logs/analyse-test-2017-08-17T13:22:09.863Z.log');
    if (fs.existsSync(fileToDelete)) fs.unlinkSync(fileToDelete);
  });
});

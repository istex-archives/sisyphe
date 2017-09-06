'use strict';

const chai = require('chai');
const expect = chai.expect;
const WalkerFs = require('../index.js');

describe('init', () => {
  it('should initialize the module', () => {
    const walkerFs = Object.create(WalkerFs);
    expect(walkerFs.init).to.be.a('function');
    walkerFs.init({ corpusname: 'test', now: 1502976129863 });
    expect(walkerFs.now).to.equal(1502976129863);
    expect(walkerFs.corpusname).to.equal('test');
  });
});

describe('doTheJob', () => {
  it('should do the job for a input doc', (done) => {
    const walkerFs = Object.create(WalkerFs);
    walkerFs.init({ corpusname: 'test', now: 1502976129863 });
    const data = {
      directory: 'test/data'
    };
    walkerFs.doTheJob(data, (error, content) => {
      if (error) return done(error);
      expect(content).to.be.a('object');
      expect(content).to.have.own.property('directory');
      expect(content.directory).to.be.a('string');
      expect(content).to.have.own.property('directories');
      expect(content.directories).to.be.a('array');
      expect(content).to.have.own.property('files');
      expect(content.files).to.be.a('array');
      content.files.map((file) => {
        expect(file).to.be.a('object');
        expect(file).to.have.own.property('corpusname');
        expect(file.corpusname).to.equal('test');
        expect(file).to.have.own.property('startAt');
        expect(file.startAt).to.equal(1502976129863);
        expect(file).to.have.own.property('extension');
        expect(file.extension).to.be.a('string');
        expect(file).to.have.own.property('path');
        expect(file.path).to.be.a('string');
        expect(file).to.have.own.property('name');
        expect(file.name).to.be.a('string');
        expect(file).to.have.own.property('size');
        expect(file.size).to.be.a('number');
      });
      done();
    });
  });
});

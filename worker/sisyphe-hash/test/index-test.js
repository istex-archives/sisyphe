'use strict';

const fs = require('fs'),
  rimraf = require('rimraf'),
  path = require('path'),
  chai = require('chai'),
  expect = chai.expect,
  sisypheHash = require('../index.js');

const baseDoc = {
  corpusname: 'test',
  mimetype: 'application/pdf',
  startAt: 12345678900,
  extension: '.pdf'
};

const docWithSmallPdf = Object.assign({
  path: __dirname + '/data/small.pdf',
  name: 'small.pdf',
  size: 77123
}, baseDoc);
const docWithBigPdf = Object.assign({
  path: __dirname + '/data/big.pdf',
  name: 'big.pdf',
  size: 101688487
}, baseDoc);

describe('doTheJob', function () {
  this.timeout(0);
  it('should do the job with a small file', (done) => {
    const sisypheHashTest = Object.create(sisypheHash);
    sisypheHashTest.doTheJob(docWithSmallPdf, (error, docOutput) => {
      if (error) done(error);
      expect(docOutput.hash).to.be.equal('97a36af46c74151b55378c02055f796b');
      const pathFileChecksum = path.resolve(
        __dirname,
        '../../..',
        `checksum/${docOutput.corpusname}-${docOutput.startAt}.csv`
      );
      expect(fs.existsSync(pathFileChecksum)).to.be.true;
      done();
    })
  });

  it('should do the job with a big file', (done) => {
    const sisypheHashTest = Object.create(sisypheHash);
    sisypheHashTest.doTheJob(docWithBigPdf, (error, docOutput) => {
      if (error) done(error);
      expect(docOutput.hash).to.be.equal('992987a7e299fe7b76a792a5c2605688');
      const pathFileChecksum = path.resolve(
        __dirname,
        '../../..',
        `checksum/${docOutput.corpusname}-${docOutput.startAt}.csv`
      );
      expect(fs.existsSync(pathFileChecksum)).to.be.true;
      done();
    })
  });

  after(() => {
    const pathFileChecksum = path.resolve(
      __dirname,
      '../../..',
      `checksum/test*.csv`
    );
    rimraf.sync(pathFileChecksum)
  })
});

describe('generateHashFromABigFile', function () {
  this.timeout(0);
  it('should return a hash from a big file', () => {
    return sisypheHash.generateHashFromABigFile(__dirname + '/data/big.pdf').then((hash) => {
      expect(hash).to.be.equal('992987a7e299fe7b76a792a5c2605688')
    })
  })
});

describe('generateHashFromASmallFile', function () {
  this.timeout(0);
  it('should return a hash from a small file', () => {
    return sisypheHash.generateHashFromASmallFile(__dirname + '/data/small.pdf').then((hash) => {
      expect(hash).to.be.equal('97a36af46c74151b55378c02055f796b')
    })
  })
});
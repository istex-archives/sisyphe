'use strict';

const chai = require('chai'),
  expect = chai.expect,
  sisyphePdf = require('../index.js');

const dataInput = {
  corpusname: 'default',
  debugmod: true,
  mimetype: 'application/pdf',
  startAt: 1479731952814,
  extension: '.pdf',
  path: __dirname + '/data/test.pdf',
  name: 'test.pdf',
  size: 123456
};

describe('doTheJob', function () {
  it('should add some info about the PDF', function (done) {
    sisyphePdf.doTheJob(dataInput, (error, dataOutput) => {
      if (error) return done(error);
      expect(dataOutput).to.have.property('pdfPageTotal');
      expect(dataOutput.pdfPageTotal).to.be.a('number');
      expect(dataOutput).to.have.property('pdfWordCount');
      expect(dataOutput.pdfWordCount).to.be.a('number');
      expect(dataOutput).to.have.property('pdfWordByPage');
      expect(dataOutput.pdfWordByPage).to.be.a('number');
      expect(dataOutput).to.have.property('pdfMetadata');
      done();
    });
  })
});

describe('getPdfMetaData', function () {
  it("should return a promise with the PDF's metadata", function () {
    return sisyphePdf.getPdfMetaData(dataInput.path).then((pdfMetadata) => {
      expect(pdfMetadata).to.have.property('PDFFormatVersion');
      expect(pdfMetadata).to.have.property('Title');
      expect(pdfMetadata).to.have.property('Author');
    })
  })
});

describe('getPdfWordCount', function () {
  it("should return a promise with the total number of words in the pdf", function () {
    return sisyphePdf.getPdfWordCount(dataInput.path).then((pdfWordCount) => {
      expect(pdfWordCount).to.be.a('number');
      expect(pdfWordCount).to.equal(574);
    })
  })
});

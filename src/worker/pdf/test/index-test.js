'use strict';

const chai = require('chai'),
  expect = chai.expect,
  os = require('os'),
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

beforeEach(function() {
  return sisyphePdf.init();
});

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
      expect(dataOutput.pdfMetadata).to.have.property('PDFFormatVersion');
      expect(dataOutput.pdfMetadata).to.have.property('Title');
      expect(dataOutput.pdfMetadata).to.have.property('Author');
      done();
    });
  })
});

if(os.platform() !== 'darwin' && os.platform() !== 'linux'){
  describe('getPdfMetaData', function () {
    it("should return a promise with the PDF's metadata", function () {
      return sisyphePdf.myPdfModule.getPdfMetaData(dataInput).then((pdfMetadata) => {
        expect(pdfMetadata).to.have.property('info');
        expect(pdfMetadata).to.have.property('metadata');
        expect(pdfMetadata.info).to.have.property('PDFFormatVersion');
        expect(pdfMetadata.info).to.have.property('Title');
        expect(pdfMetadata.info).to.have.property('Author');
      })
    })
  });
}

if(os.platform() === 'darwin' || os.platform() === 'linux'){
  describe('getPdfWordCount', function () {
    it("should return a promise with the total number of words in the pdf", function () {
      sisyphePdf.myPdfModule.popplonode.load(dataInput.path);
      return sisyphePdf.myPdfModule.getPdfWordCount(1).then((pdfWordCount) => {
        expect(pdfWordCount).to.be.a('number');
        expect(pdfWordCount).to.equal(574);
      });
    });
  });
}

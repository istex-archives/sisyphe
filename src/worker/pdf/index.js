'use strict';

const bluebird = require('bluebird');
const cp = require('child_process')

const sisyphePdf = {};

sisyphePdf.doTheJob = function(data, next) {
  if (data.mimetype === 'application/pdf') {
    bluebird.join(this.getPdfMetaData(data.path), this.getPdfWordCount(data.path), (metadata, pdfWordCount) => {
      data.pdfMetadata = metadata
      data.pdfPageTotal = +metadata.Pages
      data.pdfWordCount = +pdfWordCount
      data.pdfWordByPage = ~~(data.pdfWordCount / data.pdfPageTotal);
      next(null, data);
    }).catch((error) => {
      console.log(error);
      data.pdfError = JSON.stringify(error);
      next(null, data);
    })
  } else {
    next(null, data);
  }
};

sisyphePdf.getPdfMetaData = function(filePath) {
  return new Promise(function(resolve, reject) {
    cp.exec('pdfinfo ' + filePath, function(error, stdout, stderr) {
      const metadataObject = {}
      stdout.split('\n').map(meta => {
        const metadataLine = meta.split(': ').map(m => m.trim())
        metadataObject[metadataLine[0]] = metadataLine[1]
      })
      metadataObject.PDFFormatVersion = metadataObject['PDF version']
      delete metadataObject['PDF version']
      resolve(metadataObject)
    });
  });
};

sisyphePdf.getPdfWordCount = function(filePath) {
  return new Promise(function(resolve, reject) {
    cp.exec('pdftotext "' + filePath + '" -', function(error, stdout, stderr) {
      if (stderr) return reject(stderr)
      resolve(stdout.split(/\s+/).length)
    });
  })
};

module.exports = sisyphePdf;

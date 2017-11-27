'use strict';

const bluebird = require('bluebird');
const fs = bluebird.promisifyAll(require('fs'));
require('pdfjs-dist');
global.DOMParser = require('xmldom').DOMParser;

const sisyphePdfJs = {};

sisyphePdfJs.doTheJob = function (data, next) {
  bluebird.join(this.getPdfMetaData(data), this.getPdfWordCount(data), (pdfMetadata, pdfWordCount) => {
    data.pdfWordCount = pdfWordCount;
    data.pdfWordByPage = Math.floor(data.pdfWordCount / data.pdfPageTotal);
    data.pdfMetadata = pdfMetadata.info;
    next(null, data);
  }).catch((error) => {
    data.pdfError = JSON.stringify(error);
    next(null,data);
  })
};

sisyphePdfJs.getPdfMetaData = function (data) {
  return fs.readFileAsync(data.path).then((data) => {
    const pdfData = new Uint8Array(data);
    return PDFJS.getDocument(pdfData);
  }).then((doc) => {
    return doc.getMetadata()
  });
};


sisyphePdfJs.getPdfWordCount = function (data) {
  return fs.readFileAsync(data.path).then((data) => {
    const pdfData = new Uint8Array(data);
    return PDFJS.getDocument(pdfData);
  }).then((doc) => {
    const numPages = doc.numPages;
    data.pdfPageTotal = numPages;
    const numPagesArr = Array.from(new Array(numPages), (val, index)=>index + 1);
    return bluebird.map(numPagesArr, (pageNum) => {
      return doc.getPage(pageNum)
    })
  }).then((pages) => {
    return bluebird.map(pages, (page) => {
      return page.getTextContent()
    })
  }).then((pagesContent) => {
    return pagesContent.map((pageContent) => {
      return pageContent.items.map((item) => item.str)
      .join(' ')
      .split(/\s+/)
        .length;
    }).reduce((previous, current) => previous + current)
  });
};



module.exports = sisyphePdfJs;
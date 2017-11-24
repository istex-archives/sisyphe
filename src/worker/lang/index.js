'use strict';

const bluebird = require('bluebird'),
  fs = bluebird.promisifyAll(require('fs')),
  cld = bluebird.promisifyAll(require('cld'));

const sisypheLangDetect = {};

sisypheLangDetect.doTheJob = function(data, next) {
  // This module only detect on plain & xml like file mimetype
  if (data.mimetype !== 'application/xml' && data.mimetype !== 'text/plain' && data.mimetype !== 'text/html' && data.mimetype !== 'application/xhtml+xml' && !data.fulltext) {
    return next(null,data)
  }
  let isHTML = (data.mimetype === 'application/xml' || data.mimetype === 'text/html' || data.mimetype === 'application/xhtml+xml');
  fs.readFileAsync(data.path, 'utf-8').then((txtData) => {
    if (txtData.length !== 0) {
      return cld.detectAsync(txtData, {isHTML});
    }
    return {
      reliable: false,
      chunks: '',
      textBytes: 0
    }
  }).then((result) => {
    delete result.chunks;
    delete result.textBytes;
    data.langDetect = result;
    next(null,data);
  }).catch((error) => {
    data.langDetect = { reliable: false };
    data.langDetectError = error;
    next(null,data);
  })
};

module.exports = sisypheLangDetect;
'use strict';
const os = require('os');
const bluebird = require('path');
const sisyphePdf = {};

if(os.platform() === 'darwin' || os.platform() === 'linux'){
  sisyphePdf.myPdfModule = require('./popplonode.js');
}else{
  sisyphePdf.myPdfModule = require('./pdfjs.js');
}

sisyphePdf.init = function (options) {
  if(os.platform() === 'darwin' || os.platform() === 'linux'){
    this.myPdfModule.init(options);
  }
};

sisyphePdf.doTheJob = function (docObject, next) {
  if (docObject.mimetype === 'application/pdf') {
    this.myPdfModule.doTheJob(docObject,next);
  } else {
    next(null, docObject);
  }
};

module.exports = sisyphePdf;

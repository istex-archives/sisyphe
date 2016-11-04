'use strict';

const DOMParser = require('xmldom').DOMParser,
  bluebird = require('bluebird'),
  fs = bluebird.promisifyAll(require('fs')),
  getDoctype = bluebird.promisifyAll(require("get-doctype"));

const sisypheXml = {};
sisypheXml.doTheJob = function (data, next) {
  if (data.mimetype === 'application/xml') {
    const wellFormedError = {};
    const errorHandle = function (wellFormedErrorObj) {
      return function (level, msg, locator) {
        wellFormedErrorObj[level] = {
          message: msg,
          locator
        }
      }
    };

    const parser = new DOMParser({
      locator: {},
      errorHandler: {
        warning: errorHandle(wellFormedError),
        error: errorHandle(wellFormedError),
        fatalError: errorHandle(wellFormedError)
      }
    });

    bluebird.join(
      fs.readFileAsync(data.path, 'utf8'),
      getDoctype.parseFileAsync(data.path),
      function(xmlContent, doctype) {
        data.doctype = doctype;
        parser.parseFromString(xmlContent, 'application/xml');
        data.isWellFormed = Object.keys(wellFormedError).length === 0;
        if (!data.isWellFormed) {
          data.wellFormedError = wellFormedError;
        }
        next(null, data);
      }
    ).catch((error) => {
      next(error);
    });
  } else {
    next(null, data);
  }
};

module.exports = sisypheXml;

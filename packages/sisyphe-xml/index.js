'use strict';

const DOMParser = require('xmldom').DOMParser,
  xpath = require('xpath'),
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

    const getConf = (corpusname) => {
      const pathToConf = __dirname + '/conf/' + corpusname + '.json';
      return fs.accessAsync(pathToConf, fs.constants.R_OK).then(() => {
        return fs.readFileAsync(pathToConf)
      }).then((dataConf) => {
        return JSON.parse(dataConf);
      });
    };

    bluebird.join(
      fs.readFileAsync(data.path, 'utf8'),
      getDoctype.parseFileAsync(data.path),
      function(xmlContent, doctype) {
        data.doctype = doctype;
        const xmlDom = parser.parseFromString(xmlContent, 'application/xml');
        data.isWellFormed = Object.keys(wellFormedError).length === 0;
        if (!data.isWellFormed) {
          data.wellFormedError = wellFormedError;
          next(null, data);
        } else {
          getConf(data.corpusname).then((conf) => {
            conf.metadata.map((metadata) => {
              let value = xpath.select(metadata.xpath, xmlDom);
              if (metadata.type === 'String' || metadata.type === 'Number') value = value.toString();
              if (metadata.hasOwnProperty('regex')) {
                const regex = new RegExp(metadata.regex);
                const isValueValid = regex.test(value);
                if (isValueValid) {
                  data[metadata.name + 'IsValid'] = isValueValid;
                  data[metadata.name] = parseInt(value, 10);
                } else {
                  data[metadata.name + 'IsValid'] = isValueValid;
                  data[metadata.name + 'Error'] = value;
                }
              } else {
                data[metadata.name] = value;
              }
            });
            next(null, data);
          });
        }
      }
    ).catch((error) => {
      next(error);
    });
  } else {
    next(null, data);
  }
};

module.exports = sisypheXml;

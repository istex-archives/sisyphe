'use strict';

const DOMParser = require('xmldom').DOMParser,
  xpath = require('xpath'),
  Promise = require('bluebird'),
  fs = Promise.promisifyAll(require('fs')),
  getDoctype = Promise.promisifyAll(require("get-doctype"));

const sisypheXml = {};
sisypheXml.doTheJob = function (data, next) {

  if (data.mimetype !== 'application/xml') {
    return next(null, data);
  }

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

  fs.readFileAsync(data.path, 'utf8').then((xmlContent) => {
    const xmlDom = parser.parseFromString(xmlContent, 'application/xml');
    data.isWellFormed = Object.keys(wellFormedError).length === 0;
    if (data.isWellFormed) {
      getDoctype.parseFileAsync(data.path).then((doctype) => {
        data.doctype = doctype;
        return getConf(data.corpusname);
      }).then((conf) => {
        if (!conf.metadata) {
          // config file empty, add error here
          next(null, data);
          return;
        }
        conf.metadata.map((metadata) => {
          // Select the first XPATH possibility
          let value = null;
          if (Array.isArray(metadata.xpath)) {
            for (let i = 0; i < metadata.length; i++) {
              let currValue = xpath.select(metadata[i].xpath, xmlDom);
              if (currValue.length) {
                value = currValue;
                break;
              }
            }
          } else {
            value = xpath.select(metadata.xpath, xmlDom);
          }
          value = (metadata.type === 'String' || metadata.type === 'Number') ? value.toString() : value;

          if (!value) {
            // Will not check if value is empty
            console.log('xpath :', metadata.xpath);
            return;
          }

          if (!metadata.hasOwnProperty('regex')) {
            value = (metadata.type === 'Number') ? parseInt(value, 10) : value;
            data[metadata.name] = value;
            return;
          }

          const regex = new RegExp(metadata.regex),
            isValueValid = regex.test(value);

          if (!isValueValid) {
            data[metadata.name + 'IsValid'] = isValueValid;
            data[metadata.name + 'Error'] = value;
            return;
          }
          data[metadata.name + 'IsValid'] = isValueValid;
          value = (metadata.type === 'Number') ? parseInt(value, 10) : value;
          data[metadata.name] = value;
        });
        next(null, data);
      }).catch(error => {
        data.wellFormedError = error;
        data.isWellFormed = false;
        return next(null, data)
      })
    } else {
      data.wellFormedError = wellFormedError;
      next(null, data);
    }
  }).catch((err) => {
    next(err, data);
  });
};

module.exports = sisypheXml;
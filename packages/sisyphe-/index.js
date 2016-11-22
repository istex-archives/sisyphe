'use strict';

const assert = require('assert'),
  DOMParser = require('xmldom').DOMParser,
  xpath = require('xpath'),
  Promise = require('bluebird'),
  fs = Promise.promisifyAll(require('fs')),
  getDoctype = Promise.promisifyAll(require("get-doctype"));

const sisypheXml = {};
sisypheXml.init = function () {
  this.wellFormedError = {};
  this.errorHandle = function (wellFormedErrorObj) {
    return function (level, msg, locator) {
      wellFormedErrorObj[level] = {
        message: msg,
        locator
      }
    }
  };

  this.parser = new DOMParser({
    locator: {},
    errorHandler: {
      warning: this.errorHandle(this.wellFormedError),
      error: this.errorHandle(this.wellFormedError),
      fatalError: this.errorHandle(this.wellFormedError)
    }
  });
};

sisypheXml.doTheJob = function (data, next) {
  if (data.mimetype !== 'application/xml') {
    return next(null, data);
  }

  this.init();
  fs.readFileAsync(data.path, 'utf8').then((xmlContent) => {
    const xmlDom = this.parser.parseFromString(xmlContent, 'application/xml');
    data.isWellFormed = Object.keys(this.wellFormedError).length === 0;
    if (!data.isWellFormed) data.wellFormedError = this.wellFormedError;
    return getDoctype.parseFileAsync(data.path).then((doctype) => {
      data.doctype = doctype;
      return xmlDom;
    }).catch((error) => {
      data.wellFormedError = error;
      data.isWellFormed = false;
      return xmlDom;
    });
  }).then((xmlDom) => {
    if (!data.isWellFormed) {
      return next(null, data);
    }
    this.getConf(data.corpusname).then((conf) => {
      return this.getMetadataInfos(conf, xmlDom);
    }).then((metadatas) => {
      metadatas.map((metadata) => {
        data[metadata.name + 'IsValid'] = metadata.isValueValid;
        if (metadata.isValueValid) {
          data[metadata.name] = (metadata.type === 'Number') ? parseInt(metadata.value, 10) : metadata.value;
        } else {
          data[metadata.name + 'Error'] = metadata.value;
        }
      });
      next(null, data);
    }).catch(() => {
      next(null, data);
    });
  });
};

sisypheXml.getConf = function (corpusname) {
  const pathToConf = __dirname + '/conf/' + corpusname + '.json';
  return fs.accessAsync(pathToConf, fs.constants.R_OK).then(() => {
    return fs.readFileAsync(pathToConf)
  }).then((dataConf) => {
    return JSON.parse(dataConf);
  });
};

sisypheXml.checkConf = function (confObj) {
  return new Promise((resolve) => {
    assert(confObj.hasOwnProperty('metadata'));
    assert(Array.isArray(confObj.metadata));
    confObj.metadata.map((metadata) => {
      assert(metadata.hasOwnProperty('name'));
      assert(metadata.hasOwnProperty('type'));
      assert(metadata.hasOwnProperty('xpath'));
    });
    resolve(true);
  })
};

sisypheXml.getMetadataInfos = function (confObj, xmlDom) {
  return confObj.metadata.map((metadata) => {
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
    if (value) metadata.value = value;
    return metadata;
  }).map((metadata) => {
    if (metadata.hasOwnProperty('regex') && metadata.hasOwnProperty('value')) {
      const regex = new RegExp(metadata.regex);
      metadata.isValueValid = regex.test(metadata.value);
    }
    return metadata;
  });
};

module.exports = sisypheXml;
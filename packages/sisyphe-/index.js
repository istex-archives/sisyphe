'use strict';

const assert = require('assert'),
  DOMParser = require('xmldom').DOMParser,
  xpath = require('xpath'),
  Promise = require('bluebird'),
  fs = Promise.promisifyAll(require('fs')),
  getDoctype = require("get-doctype");

const sisypheXml = {};
sisypheXml.doTheJob = function (docObject, next) {
  if (docObject.mimetype !== 'application/xml') {
    return next(null, docObject);
  }

  Promise.join(
    this.getXmlDom(docObject.path),
    this.getDoctype(docObject.path),
    function (xmlDom, doctype) {
      docObject.doctype = doctype;
      return xmlDom;
    }
  ).then((xmlDom) => {
    docObject.isWellFormed = true;
    this.getConf(docObject.corpusname).then((conf) => {
      return this.checkConf(conf);
    }).then((conf) => {
      return this.getMetadataInfos(conf, xmlDom);
    }).then((metadatas) => {
      metadatas.map((metadata) => {
        if (metadata.hasOwnProperty('isValueValid')) {
          docObject[metadata.name + 'IsValid'] = metadata.isValueValid;
          if (metadata.isValueValid) {
            docObject[metadata.name] = (metadata.type === 'Number') ? parseInt(metadata.value, 10) : metadata.value;
          }
          else {
            docObject[metadata.name + 'Error'] = metadata.value;
          }
        } else {
          docObject[metadata.name] = (metadata.type === 'Number') ? parseInt(metadata.value, 10) : metadata.value;
        }
      });
      next(null, docObject);
    }).catch(() => {
      next(null, docObject);
    });
  }).catch((error) => {
    docObject.isWellFormed = false;
    docObject.error = error;
    next(null, docObject);
  });
};

sisypheXml.getXmlDom = function (xmlFilePath) {
  const error = new Error();
  error.type = 'wellFormed';
  error.list = [];
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
      warning: errorHandle(error.list),
      error: errorHandle(error.list),
      fatalError: errorHandle(error.list)
    }
  });

  return new Promise((resolve, reject) => {
    fs.readFileAsync(xmlFilePath, 'utf8').then((xmlContent) => {
      const xmlDom = parser.parseFromString(xmlContent, 'application/xml');
      if (Object.keys(error.list).length === 0) {
        resolve(xmlDom)
      } else {
        reject(error)
      }
    })
  })
};

sisypheXml.getDoctype = function (xmlFilePath) {
  return new Promise((resolve, reject) => {
    getDoctype.parseFile(xmlFilePath, (error, doctype) => {
      if (error) {
        error.type = 'doctype';
        reject(error);
      } else {
        resolve(doctype);
      }
    })
  })
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
    resolve(confObj);
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
    metadata.value = value;
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
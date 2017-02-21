'use strict';

const assert = require('assert'),
  path = require('path'),
  DOMParser = require('xmldom').DOMParser,
  xpath = require('xpath'),
  Promise = require('bluebird'),
  fs = Promise.promisifyAll(require('fs')),
  exec = Promise.promisify(require('child_process').exec),
  getDoctype = require("get-doctype");

const xpathSelect = xpath.useNamespaces({"xml": "http://www.w3.org/XML/1998/namespace"});

const sisypheXml = {};

var dtdPath,
    configPath;

sisypheXml.init = function(options){
  dtdPath = options.dtd || null;
  configPath = options.config || null;
};

sisypheXml.doTheJob = function (docObject, next) {
  if (docObject.mimetype !== 'application/xml') {
    return next(null, docObject);
  }
  // TODO : refactore this Promise Hell (like Callback Hell)
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
      const dtdsPath = dtdPath 
        ? conf.dtd.map((dtd) => path.resolve(dtdPath, 'dtd/', dtd))
        : conf.dtd.map((dtd) => __dirname + '/conf/' + docObject.corpusname + '/dtd/' + dtd);
      this.validateAgainstDTD(docObject, dtdsPath).then((validationDTDresult) => {
        docObject.isValidAgainstDTD = true;
        docObject.validationDTDInfos = validationDTDresult;
      }).then(() => {
        this.getMetadataInfos(conf, xmlDom).map((metadata) => {
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
        }).then(() => {
          next(null, docObject);
        }).catch((error) => {
          docObject.metadataErrors = error.toString();
          next(null, docObject);
        });
      }).catch((error) => {
        docObject.isValidAgainstDTD = false;
        docObject.error = error;
        next(null, docObject);
      });
    }).catch({code: 'ENOENT'}, () => {
      next(null, docObject);
    }).catch((error) => {
      docObject.error = error;
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
  error.list = {};
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
  const pathToConf = configPath || __dirname + '/conf/' + corpusname + '/' + corpusname + '.json';
  return fs.accessAsync(pathToConf, fs.constants.R_OK).then(() => {
    return fs.readFileAsync(pathToConf, 'utf8')
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
  return Promise.map(confObj.metadata, (metadata) => {
    // Select the first XPATH possibility
    if (Array.isArray(metadata.xpath)) {
      for (let i = 0; i < metadata.xpath.length; i++) {
        const itemElement = xpathSelect(metadata.xpath[i], xmlDom);
        if (itemElement.length) {
          metadata.element = itemElement;
          break;
        }
      }
      if (!metadata.element) metadata.element = []
    } else {
      metadata.element = xpathSelect(metadata.xpath, xmlDom);
    }

    if (metadata.hasOwnProperty('element')) {
      metadata.element.isEmpty = metadata.element.length;
      if (metadata.element.isEmpty) {
        metadata.element.hasFirstChild = metadata.element[0].hasOwnProperty('firstChild');
      }
      if (metadata.element.isEmpty && metadata.element.hasFirstChild) {
        metadata.element.hasDataInFirstChild = metadata.element[0].firstChild.hasOwnProperty('data');
      }

      switch (metadata.type) {
        case "String":
          if (metadata.element.isEmpty && metadata.element.hasFirstChild && metadata.element.hasDataInFirstChild) {
            metadata.value = metadata.element[0].firstChild.data;
          }
          break;
        case "Number":
          if (metadata.element.isEmpty && metadata.element.hasFirstChild && metadata.element.hasDataInFirstChild) {
            metadata.value = metadata.element[0].firstChild.data;
          }
          break;
        case "Boolean":
          metadata.value = !!metadata.element.length;
          break;
        case "Count":
          metadata.value = metadata.element.length;
          break;
        case "Attribute":
          if (metadata.element.length) metadata.value = metadata.element[0].value;
          if (metadata.element.length) metadata.value = metadata.element[0].value;
          break;
      }
    }
    return metadata;
  }).map((metadata) => {
    if (metadata.hasOwnProperty('regex') && metadata.hasOwnProperty('value')) {
      const regex = new RegExp(metadata.regex);
      metadata.isValueValid = regex.test(metadata.value);
    }
    return metadata;
  });
};

sisypheXml.validateAgainstDTD = function (docObj, arrayPathDTD) {
  const DTDs = arrayPathDTD;
  const dtdToValidateFirst = docObj.doctype.sysid;
  Array.prototype.move = function (old_index, new_index) {
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this;
  };

  return new Promise((resolve, reject) => {
    const indexDtdToValidateFirst = DTDs.map((pathDtd) => path.basename(pathDtd)).indexOf(dtdToValidateFirst);
    if (indexDtdToValidateFirst !== -1) DTDs.move(indexDtdToValidateFirst, 0);

    (function loop(arrayDTD) {
      if (arrayDTD.length) {
        const dtd = arrayDTD.shift();
        exec('xmlstarlet val -e -d ' + dtd + ' ' + docObj.path).then((stdout) => {
          resolve({dtd, stdout})
        }).catch(() => {
          loop(arrayDTD)
        })
      } else {
        const error = new Error();
        error.message = 'No DTD validate the xml file';
        error.type = "validation-dtd";
        reject(error)
      }
    })(DTDs)
  })
};

module.exports = sisypheXml;
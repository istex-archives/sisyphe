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

function to(promise, errorExt) {
  return promise.then(function (data) {
    return [null, data];
  }).catch(function (err) {
    if (errorExt) err = Object.assign(err, errorExt);
    return [err];
  });
}

const sisypheXml = {};

sisypheXml.init = function (options) {
  this.configDir = options.configDir || path.resolve(__dirname, 'conf');
  let confContents = fs.readdirSync(this.configDir);
  //We search the nearest config in configDir
  for(var folder of confContents){
    let currPath = path.join(this.configDir,folder)
    if(fs.lstatSync(currPath).isDirectory() && options.corpusname.includes(folder)){  
      this.pathToConf = path.resolve(this.configDir, folder, 'sisyphe-xml' + '.json');
      break;
    }
  }
  this.isConfExist = this.pathToConf && fs.existsSync(this.pathToConf);
  if (this.isConfExist) {
    const dataConf = fs.readFileSync(this.pathToConf, 'utf8');
    this.conf = JSON.parse(dataConf);
    if (this.conf.hasOwnProperty('dtd') && Array.isArray(this.conf.dtd)) {
      this.dtdsPath = this.conf.dtd.map((dtd) => path.resolve(this.configDir, options.corpusname, 'dtd', dtd));
    }
  }

  return this
};

sisypheXml.doTheJob = function (docObject, next) {
  if (docObject.mimetype !== 'application/xml') return next(null, docObject);

  (async () => {
    let error, xmlDom, validationDTDResult;

    [error, docObject.doctype] = await to(this.getDoctype(docObject.path));

    [docObject.error, xmlDom] = await to(this.getXmlDom(docObject.path));
    if (docObject.error) {
      docObject.isWellFormed = false;
      return docObject;
    }

    docObject.isWellFormed = true;

    if (!this.isConfExist) return docObject;

    [error, validationDTDResult] = await to(this.validateAgainstDTD(docObject, this.dtdsPath));
    if (docObject.error) {
      docObject.isValidAgainstDTD = false;
      return docObject;
    }

    docObject.isValidAgainstDTD = true;
    docObject.validationDTDInfos = validationDTDResult;
    let metadatas;
    [docObject.error, metadatas] = await to(this.getMetadataInfos(this.conf, xmlDom));
    if (docObject.error) {
      return docObject;
    }

    metadatas.map((metadata) => {
      if (!metadata.hasOwnProperty('isValueValid')) {
        // no isValueValid , we stop here
        docObject[metadata.name] = (metadata.type === 'Number') ? parseInt(metadata.value, 10) : metadata.value;
        return;
      }
      docObject[metadata.name + 'IsValid'] = metadata.isValueValid;
      if (metadata.isValueValid) {
        docObject[metadata.name] = (metadata.type === 'Number') ? parseInt(metadata.value, 10) : metadata.value;
      } else {
        docObject[metadata.name + 'Error'] = metadata.value;
      }
    });
    return docObject;
  })().then((docObject) => {
    if (docObject.error) docObject.error = JSON.stringify(docObject.error);
    next(null, docObject)
  }).catch((error) => {
    next(error)
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
      metadata.element = metadata.element || [];
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
  const DTDs = arrayPathDTD.slice();

  function moveTo(array, old_index, new_index) {
    array.splice(new_index, 0, array.splice(old_index, 1)[0]);
    return array;
  }

  return new Promise((resolve, reject) => {
    if (docObj.hasOwnProperty('doctype')) {
      const dtdToValidateFirst = docObj.doctype.sysid;
      const indexDtdToValidateFirst = DTDs.map((pathDtd) => path.basename(pathDtd)).indexOf(dtdToValidateFirst);
      if (indexDtdToValidateFirst !== -1) moveTo(DTDs, indexDtdToValidateFirst, 0);
    }

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
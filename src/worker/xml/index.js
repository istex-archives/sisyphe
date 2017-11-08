'use strict';

const assert = require('assert'),
  path = require('path'),
  fs = require('fs'),
  pkg = require('./package.json'),
  Libxml = require('node-libxml'),
  Promise = require('bluebird'),
  cloneDeep = require('lodash.clonedeep');

function to (promise, errorExt) {
  return promise
  .then(function (data) {
    return [null, data];
  })
  .catch(function (err) {
    if (errorExt) err = Object.assign(err, errorExt);
    return [err];
  });
}

const sisypheXml = {};

sisypheXml.init = function (options) {
  // Libxml is in manual memory management, because sisyphe does not want to freeup memory object automaticaly
  this.libxml = new Libxml(true);
  this.configDir = options.configDir || path.resolve(__dirname, 'conf');
  this.configFilename = options.configFilename || 'sisyphe-conf.json';
  this.isConfExist = options.config && options.config.hasOwnProperty(pkg.name);
  if (this.isConfExist && options.pathToConf) {
    this.conf = options.config[pkg.name];
    if (this.conf.hasOwnProperty('dtd') && Array.isArray(this.conf.dtd)) {
      this.dtdsPath = this.conf.dtd.map(dtd => path.resolve(path.dirname(options.pathToConf), 'dtd', dtd));
    }
  }
  return this;
};

sisypheXml.doTheJob = function (data, next) {
  if (data.mimetype !== 'application/xml') return next(null, data);

  (async () => {
    // Load xml, return false if not-wellformed, true if wellformed
    let xmlFile = this.libxml.loadXml(data.path);

    if (!xmlFile) {
      data.isWellFormed = false;
      // Attentio, syntax is differen wellformedError:wellformedErrors 😖
      data.wellFormedErrors = (this.libxml.wellformedErrors && this.libxml.wellformedErrors.length) ? this.libxml.wellformedErrors : null;
      // Important, free xml C memory & JS Objects
      return data;
    }

    let doctype = this.libxml.getDtd();

    // Reformat key for DTD to retro-compatible old sisyphe version
    if(doctype && doctype.hasOwnProperty('externalId')){ doctype.pubid = doctype.externalId; delete doctype.externalId; }
    if(doctype && doctype.hasOwnProperty('systemId')){ doctype.sysid = doctype.systemId; delete doctype.systemId; }
    data.doctype = doctype;

    data.isWellFormed = true;

    if (!this.isConfExist) { return data };

    let result = this.validateAgainstDTD(this.libxml, this.dtdsPath);
    if (result && result.hasOwnProperty('isValid') && !result.isValid) {
      data.isValidAgainstDTD = false;
      // we set validation Error only if there are somes.
      data.validationErrors = (this.libxml.validationErrors && this.libxml.validationErrors.length) ? this.libxml.validationErrors : null;
      // Important, free xml & dtd C memory & JS Objects
      return data;
    }

    data.isValidAgainstDTD = true;
    data.validationDTDInfos = result.path;

    let metadatas;
    const conf = cloneDeep(this.conf);
    [data.error, metadatas] = await to(this.getMetadataInfos(conf, this.libxml));
    if (data.error) {
      return data;
    }

    metadatas.map(metadata => {
      if (!metadata.hasOwnProperty('isValueValid')) {
        // no isValueValid , we stop here
        data[metadata.name] = metadata.type === 'Number' ? parseInt(metadata.value, 10) : metadata.value;
        return;
      }
      data[metadata.name + 'IsValid'] = metadata.isValueValid;
      if (metadata.isValueValid) {
        data[metadata.name] = metadata.type === 'Number' ? parseInt(metadata.value, 10) : metadata.value;
      } else {
        data[metadata.name + 'Error'] = metadata.value;
      }
    });
    return data;
  })()
    .then(data => {
      if (data.error) data.error = JSON.stringify(data.error);
      // Important, free xml & dtd C memory & JS Objects
      // this.libxml.freeDtd();
      this.libxml.freeXml();
      next(null, data);
    })
    .catch(error => {
      // this.libxml.freeDtd();
      this.libxml.freeXml();
      next(error);
    });
};

sisypheXml.getMetadataInfos = function (confObj, libxml) {
  return Promise.map(confObj.metadata, metadata => {
    // Select the first XPATH possibility
    if (Array.isArray(metadata.xpath)) {
      for (let i = 0; i < metadata.xpath.length; i++) {
        metadata.xpath[i] = sisypheXml.formatXpaths(metadata.xpath[i],metadata.type);
        const itemElement = libxml.xpathSelect(metadata.xpath[i]);
        if (itemElement !== null && itemElement !== undefined && itemElement !== "") {
          metadata.element = itemElement;
          metadata.value = itemElement;
          break;
        }
      }
    } else {
      // string is special because we need all text in its child too
      metadata.xpath = sisypheXml.formatXpaths(metadata.xpath,metadata.type);
      metadata.element = libxml.xpathSelect(metadata.xpath);
      //we afect only if defined
      if(metadata.element !== null && metadata.element !== undefined && metadata.element !== ""){
        metadata.value = metadata.element;
      }
    }
    return metadata;
  }).map(metadata => {
    if (metadata.hasOwnProperty('regex') && metadata.hasOwnProperty('value')) {
      const regex = new RegExp(metadata.regex);
      metadata.isValueValid = regex.test(metadata.value);
    }
    return metadata;
  });
};

//Normalize xpath types
sisypheXml.formatXpaths = function (xpath,type) {
  type = type.toLowerCase();
  switch (type) {
    case 'number':
      return `number(${xpath})`;
      break;
    case 'boolean':
      return `boolean(${xpath})`;
      break;
    case 'count':
      return `count(${xpath})`;
      break;
    case 'string':
    case 'attribute':
    default:
      return `string(${xpath})`;
      break;
  }
};

sisypheXml.validateAgainstDTD = function (libxml, arrayPathDTD) {

  for( let i = 0; i < arrayPathDTD.length; i++){
    let isValid = libxml.validateAgainstDtd(arrayPathDTD[i]);
    // Valid we stop here
    if(isValid) return { isValid : true, path: arrayPathDTD[i] };

  }
  return {isValid : false};
};

// sisypheXml.finalJob = function () {
//   this.libxml.clearAll();
// };

module.exports = sisypheXml;

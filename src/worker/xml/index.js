'use strict';
const assert = require('assert'),
  path = require('path'),
  fs = require('fs'),
  pkg = require('./package.json'),
  Libxml = require('node-libxml'),
  Promise = require('bluebird'),
  cloneDeep = require('lodash.clonedeep');

function to(promise, errorExt) {

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
    // Check if dtds informations are presents & load them
    if (this.conf.hasOwnProperty('dtd') && Array.isArray(this.conf.dtd)) {
      this.dtdsPath = this.conf.dtd.map(dtd => path.resolve(path.dirname(options.pathToConf), 'dtd', dtd));
      if (this.dtdsPath.length) {
        this.libxml.loadDtds(this.dtdsPath);
      }
    }
    // check if schemas informations are present & load them
    if (this.conf.hasOwnProperty('schema') && Array.isArray(this.conf.schema)) {
      this.schemasPath = this.conf.schema.map(schema => path.resolve(path.dirname(options.pathToConf), 'xsd', schema));
      if (this.schemasPath.length) {
        this.libxml.loadSchemas(this.schemasPath);
      }
    }
  }
  return this;
};
sisypheXml.doTheJob = function (data, next) {
  if (data.mimetype !== 'application/xml') {
    return next(null, data);
  }
  (async () => {
    // Load xml, return false if not-wellformed, true if wellformed
    let xmlFile = this.libxml.loadXml(data.path);
    if (!xmlFile) {
      data.isWellFormed = false;
      // Attention, syntax is different wellformedError:wellformedErrors 😖
      data.wellFormedErrors = (this.libxml.wellformedErrors && this.libxml.wellformedErrors.length) ? this.libxml.wellformedErrors : null;
      for (let property in data.wellFormedErrors) {
        if (data.wellFormedErrors[property].hasOwnProperty('message')) {
          Object.defineProperty(data.wellFormedErrors[property], 'message', {enumerable: true});
        }
      }
      return data;
    }
    let doctype = this.libxml.getDtd();
    // Reformat key for DTD to retro-compatible old sisyphe version
    if (doctype && doctype.hasOwnProperty('externalId')) {
      doctype.pubid = doctype.externalId;
      delete doctype.externalId;
    }
    if (doctype && doctype.hasOwnProperty('systemId')) {
      doctype.sysid = doctype.systemId;
      delete doctype.systemId;
    }
    data.doctype = doctype;
    data.isWellFormed = true;
    // If conf does not exist or is not as a valid format we stop here
    if (!this.isConfExist) {
      return data;
    }
    // Get Xpaths metadatas only if config is OK!
    let metadatas;
    const conf = cloneDeep(this.conf);
    if (conf && Array.isArray(conf.metadata) && conf.metadata.length) {
      [data.error, metadatas] = await to(this.getMetadataInfos(conf, this.libxml));
      if(!data.error && metadatas && metadatas.length){
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
      }
    }
    // check dtdValidation only if config dtd is OK!
    if (conf && this.dtdsPath && this.dtdsPath.length) {
      let result = this.libxml.validateAgainstDtds();
      // Cannot reformat more properly code, because it's a non-blocking check so cannot return..
      if (!result) {
        data.isValidAgainstDTD = false;
        // we set validation Error only if there are somes.
        data.validationErrors = (this.libxml.validationDtdErrors && this.libxml.validationDtdErrors) ? this.libxml.validationDtdErrors : null;
        for (let property in data.validationErrors) {
          for (let error of data.validationErrors[property]) {
            if (error.hasOwnProperty('message')) {
              Object.defineProperty(error, 'message', {enumerable: true});
            }
          }
        }
      } else {
        data.isValidAgainstDTD = true;
        // If there is a dtd name only (result can be true if validaiton is OK but dtd as no name 👀)
        if (typeof result === 'string') {
          data.validationDTDInfos = result;
        }
      }
    }
    // check schemaValidation only if config schema is OK!
    if (conf && this.schemasPath && this.schemasPath.length) {
      let result = this.libxml.validateAgainstSchemas();
      if (!result) {
        data.isValidAgainstSchema = false;
        // we set validation Error only if there are somes.
        data.validationSchemaErrors = (this.libxml.validationSchemaErrors && this.libxml.validationSchemaErrors) ? this.libxml.validationSchemaErrors : null;
        for (let property in data.validationSchemaErrors) {
          for (let error of data.validationSchemaErrors[property]) {
            if (error.hasOwnProperty('message')) {
              Object.defineProperty(error, 'message', {enumerable: true});
            }
          }
        }
      }
      else {
        data.isValidAgainstSchema = true;
        if (typeof result === 'string') {
          // If there is a schema name only (result can be true if validaiton is OK but schema as no name 👀)
          data.validatetSchemaInfo = result;
        }
      }
    }
    return data;
  })()
  .then(data => {
    if (data.error) {
      data.error = JSON.stringify(data.error)
    };
    // Important, free xml & dtd C memory & JS Objects
    this.libxml.freeXml();
    next(null, data);
  })
  .catch(error => {
    this.libxml.freeXml();
    next(error);
  });
};

sisypheXml.getMetadataInfos = function (confObj, libxml) {
  return Promise.map(confObj.metadata, metadata => {
    // Select the first XPATH possibility
    if (Array.isArray(metadata.xpath)) {
      for (let i = 0; i < metadata.xpath.length; i++) {
        metadata.xpath[i] = sisypheXml.formatXpaths(metadata.xpath[i], metadata.type);
        const itemElement = libxml.xpathSelect(metadata.xpath[i]);
        if (itemElement !== null && itemElement !== undefined && itemElement !== "" && (!Number.isNaN(itemElement))) {
          metadata.element = itemElement;
          metadata.value = itemElement;
          break;
        }
      }
    }
    else {
      // string is special because we need all text in its child too
      metadata.xpath = sisypheXml.formatXpaths(metadata.xpath, metadata.type);
      metadata.element = libxml.xpathSelect(metadata.xpath);
      //we afect only if defined
      if (metadata.element !== null && metadata.element !== undefined && metadata.element !== "" && (!Number.isNaN(metadata.element))) {
        metadata.value = metadata.element;
      }
      // Now we check metadata against regex
      if (metadata.hasOwnProperty('regex') && metadata.hasOwnProperty('value')) {
        const regex = new RegExp(metadata.regex);
        metadata.isValueValid = regex.test(metadata.value);
      }
    }
    return metadata;
  })
};
//Normalize xpath types
sisypheXml.formatXpaths = function (xpath, type) {
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

module.exports = sisypheXml;

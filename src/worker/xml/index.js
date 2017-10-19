'use strict';

const assert = require('assert'),
  path = require('path'),
  fs = require('fs'),
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
  this.libxml = new Libxml();
  this.configDir = options.configDir || path.resolve(__dirname, 'conf');
  let confContents = fs.readdirSync(this.configDir);
  // We search the nearest config in configDir
  for (var folder of confContents) {
    let currPath = path.join(this.configDir, folder);
    if (fs.lstatSync(currPath).isDirectory() && options.corpusname.includes(folder)) {
      this.pathToConf = path.resolve(this.configDir, folder, 'sisyphe-xml' + '.json');
      break;
    }
  }
  this.isConfExist = this.pathToConf && fs.existsSync(this.pathToConf);
  if (this.isConfExist) {
    const dataConf = fs.readFileSync(this.pathToConf, 'utf8');
    this.conf = JSON.parse(dataConf);
    if (this.conf.hasOwnProperty('dtd') && Array.isArray(this.conf.dtd)) {
      this.dtdsPath = this.conf.dtd.map(dtd => path.resolve(this.configDir, options.corpusname, 'dtd', dtd));
    }
  }
  return this;
};

sisypheXml.doTheJob = function (data, next) {
  if (data.mimetype !== 'application/xml') return next(null, data);

  (async () => {
    let validationDTDResult;

    // Load xml, return false if not-wellformed, true if wellformed
    let xmlFile = this.libxml.load(data.path);

    if (!xmlFile) {
      data.isWellFormed = false;
      return data;
    }

    let doctype = this.libxml.getDtd();

    // Reformat key for DTD to retro-compatible old sisyphe version
    if(doctype.externalId){ doctype.pubid = doctype.externalId; delete doctype.externalId; }
    if(doctype.systemId){ doctype.sysid = doctype.systemId; delete doctype.systemId; }
    data.doctype = doctype;

    data.isWellFormed = true;

    if (!this.isConfExist) { return data };

    [data.error, validationDTDResult] = await to(this.validateAgainstDTD(this.libxml, data, this.dtdsPath));
    if (data.error) {
      data.isValidAgainstDTD = false;
      return data;
    }

    data.isValidAgainstDTD = true;
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
      next(null, data);
    })
    .catch(error => {
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
        if (itemElement !== null && itemElement !== undefined) {
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
      if(metadata.element !== null && metadata.element !== undefined){
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

sisypheXml.validateAgainstDTD = function (libxml, data, arrayPathDTD) {
  const DTDs = arrayPathDTD.slice();

  function moveTo (array, old_index, new_index) {
    array.splice(new_index, 0, array.splice(old_index, 1)[0]);
    return array;
  }

  return new Promise((resolve, reject) => {
    if (data.hasOwnProperty('doctype')) {
      const dtdToValidateFirst = data.doctype.sysid;
      const indexDtdToValidateFirst = DTDs.map(pathDtd => path.basename(pathDtd)).indexOf(dtdToValidateFirst);
      if (indexDtdToValidateFirst !== -1) moveTo(DTDs, indexDtdToValidateFirst, 0);
    }

    (function loop (arrayDTD) {
      //if there is no more dtd to check
      if (!arrayDTD.length) {
        const error = new Error();
        error.message = 'No DTD validate the xml file';
        error.type = 'validation-dtd';
        return reject(error);
      }
      const dtd = arrayDTD.shift();
      let isValid = libxml.validateAgainstDtd(dtd);
      if(isValid) { resolve({ dtd }); }
      else { loop(arrayDTD); }
    })(DTDs);
  });
};

module.exports = sisypheXml;

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

  console.log(data.name)

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
  
  fs.readFileAsync(data.path, 'utf8').then((xmlContent)=>{
    const xmlDom = parser.parseFromString(xmlContent, 'application/xml');
    data.isWellFormed = Object.keys(wellFormedError).length === 0;
    if (!data.isWellFormed) {
      console.log('Not well formed', data.name)
      data.wellFormedError = wellFormedError;
    }
  }).then(doctype=>{
    next(null,data)
  }).catch(err=>{
    next(err,data);
  })

  // Promise.join(
  //   fs.readFileAsync(data.path, 'utf8'),
  //   getDoctype.parseFileAsync(data.path),
  //   function(xmlContent, doctype) {

  //     const xmlDom = parser.parseFromString(xmlContent, 'application/xml');
  //     data.doctype = doctype;
  //     data.isWellFormed = Object.keys(wellFormedError).length === 0;

  //     if (!data.isWellFormed) {
  //       console.log('Not well formed', data.name)
  //       data.wellFormedError = wellFormedError;
  //       return next(null, data);
  //     }
  //     console.log('Well formed', data.name)

  //     getConf(data.corpusname).then((conf) => {
  //       if(!conf.metadata){
  //         console.log('no config file stop here')
  //         //config file empty, add error here
  //         return next(null, data);
  //       }
  //       conf.metadata.map((metadata) => {
  //         // Select the first XPATH possibility
  //         let value = null;
  //         for (let i = 0; i < metadata.length; i++) {
  //           let currValue = xpath.select(metadata[i].xpath, xmlDom);
  //           if(currValue.length){
  //             value = currValue;
  //             break;
  //           }
  //         }

  //         if(!value){
  //           // Will not check if value is empty
  //           return;
  //         }
  //         value = (metadata.type === 'String' || metadata.type === 'Number') ? 
  //                 value = value.toString() : value;

  //         if(!metadata.hasOwnProperty('regex')){
  //           value = (metadata.type === 'Number') ? parseInt(value, 10) : value;
  //           data[metadata.name] = value;
  //           return;
  //         }

  //         const regex = new RegExp(metadata.regex),
  //               isValueValid = regex.test(value);

  //         if (!isValueValid) {
  //           data[metadata.name + 'IsValid'] = isValueValid;
  //           data[metadata.name + 'Error'] = value;
  //           return;
  //         }
  //         data[metadata.name + 'IsValid'] = isValueValid;
  //         value = (metadata.type === 'Number') ? parseInt(value, 10) : value;
  //         data[metadata.name] = value;
  //       });
  //       next(null, data);
  //     }).catch(error=>{
  //       data.errorXPath = error;
  //       return next(null,data)
  //     })
  //   }
  // ).catch((error) => {
  //   next(error);
  // });
  
};

module.exports = sisypheXml;
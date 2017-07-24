'use strict';

const os = require('os'),
  platform = os.platform(),
  Promise = require('bluebird'),
  child_process = Promise.promisifyAll(require('child_process')),
  fs = Promise.promisifyAll(require('fs')),
  mime = Promise.promisifyAll(require('mime')),
  mmm = require('mmmagic'),
  Magic = mmm.Magic,
  magic = Promise.promisifyAll(new Magic(mmm.MAGIC_MIME_TYPE)),
  magicEncoding = Promise.promisifyAll(new Magic(mmm.MAGIC_MIME_ENCODING)),
  magicComplete = Promise.promisifyAll(new Magic()),
  colors = require('ansicolors'),
  path = require('path'),
  isXml = require('is-xml'),
  firstline = require('firstline');

const sisypheFileType = {};

sisypheFileType.init = function (options) {
  this.isInspected = options.isInspected || false;
};

sisypheFileType.doTheJob = function (data, next) {
  if (data.mimetype) {
    return next(null, data);
  }
  if(this.isInspected){
    console.log(`${colors.yellow('filetype')}: ${data.name}`);
  }

  mime.define({
    'application/xml': ["nxml", "meta", "xlink_v03", "prime_v03", "plusxml_v02", "plusprime_v02", "info_V03", "citation_v03", "aux_v03"]
  });

  const datapath = data.path;
  let mimetype = mime.lookup(data.path);

  firstline(datapath).then((line1) => {
    if (isXml(line1)) {
      return 'application/xml';
    }
    return 'application/octet-stream';
  }).catch(() => {
    // Err loading first line 
    return 'application/octet-stream';
  })
  .then(mimeResult=>{
    if (mimeResult !== 'application/xml') {
      return magic.detectFileAsync(data.path).catch(err=>{
        return 'application/octet-stream';
      })
    }
    return mimeResult;
  })
  .then(mimeResult => {
    // Could now check all data of file
    if (mimeResult === 'text/plain') {
      return fs.readFileAsync(datapath, 'utf8').then(dataFile => {
        let nbOfXmlBalises = (dataFile.match(/<[\s\S]*?>/g) || []).length,
          seemsXml = isXml(dataFile);
        if (seemsXml || nbOfXmlBalises > 10) {
          return 'application/xml';
        }
        return mimeResult;
      }).catch(err => {
        // Err loading full data
        return mimeResult;
      })
    }
    return mimeResult;
  })
  .then(filetype => {
    data.mimetype = filetype;
    data.mimedetails = {};
    return magicEncoding.detectFileAsync(data.path).then(encoding=>{
      data.mimedetails.encoding = encoding;
      return magicComplete.detectFileAsync(data.path).then(details=>{
        data.mimedetails.complete = details;
      })
    });
  }).catch(err=>{
    data.filetypeError = err;
  }).then(()=>{
    return next(null, data);
  })
};

module.exports = sisypheFileType;
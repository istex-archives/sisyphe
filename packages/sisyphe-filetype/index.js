'use strict';

const os = require('os'),
  platform = os.platform(),
  Promise = require('bluebird'),
  child_process = Promise.promisifyAll(require('child_process')),
  fs = Promise.promisifyAll(require('fs')),
  mime = Promise.promisifyAll(require('mime')),
  path = require('path'),
  isXml = require('is-xml'),
  firstline = require('firstline');

const sisypheXml = {};

sisypheXml.doTheJob = function (data, next) {

  if(data.mimetype){
    return next(null,data)
  }

  // Permet d'identifier les fichiers .nxml (BMJ) et .Meta (Springer) comme mimetype XML
  mime.define({
    'application/xml': ["nxml", "meta", "xlink_v03", "prime_v03", "plusxml_v02", "plusprime_v02", "info_V03", "citation_v03", "aux_v03"]
  });

  let mimetype = mime.lookup(data.path);

  console.log(data.name, mimetype)

  if(mimetype !== 'application/octet-stream' && mimetype !== 'text/plain'){
    data.mimetype = mimetype;
    return next(null,data);
  }


  firstline(data.path).then(line1=>{
    if(isXml(line1)){
      console.log(data.name, 'firstline', 'application/xml')
      return 'application/xml'
    }
    console.log(data.name, 'firstline', 'application/octet-stream');
    return 'application/octet-stream'
  }).catch(err=>{
    // Err loading first line 
    console.log(data.name, 'CatchFirstline', 'application/octet-stream');
    return 'application/octet-stream'
  }).then(mimeResult=>{
    // Will now check all data of file
    if(mimeResult === 'application/octet-stream'){
      return fs.readFileAsync(data.path).then(dataFile=>{
        if(isXml(dataFile)){
          console.log(data.name, 'fulldata', 'application/xml');
          return 'application/xml'
        }
        console.log(data.name, 'fulldata', mimeResult);
        return mimeResult
      }).catch(err=>{
        console.log(data.name, 'CatchFulldata', mimeResult);
        // Err loading full data
        return mimeResult;
      })
    }
    return mimeResult;
  })
  // This is in test building ...
  // .then(mimeResult=>{
  //   //will detect wia filesystem Info
  //   if(mimeResult === 'application/octet-stream'){
  //     console.log(data.path, 'fileMime', mimeResult, platform);
  //     switch(platform){
  //       //OSX
  //       case 'darwin':
  //         return child_process.execAsync(`file -b --mime-type ${data.path}`).then((stdout, stderr)=>{
  //           if(stderr){
  //             // add corupt message here to data
  //             return mimeResult;
  //           }
  //           return stdout;
  //         }).catch(err=>{
  //           console.log('errFile',err)
  //           return mimeResult
  //         })
  //       //Windows
  //       case 'win32':
  //         return 
  //       //Linux
  //       default:
  //         return 
  //     }
  //   }
  //   return mimeResult
  // })
  .then(filetype=>{
    console.log('FileType', data.name, filetype);
    data.mimetype = filetype;
    return next(null,data)
  })
};

module.exports = sisypheXml;
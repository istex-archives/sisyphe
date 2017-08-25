'use strict';

const bluebird = require('bluebird');
const Popplonode = require('popplonode')
const cp = require('child_process');
const path = require('path')
const sisyphePdf = {};


sisyphePdf.init = function(options) {
  this.potentialError = 'Something went wrong'
}
sisyphePdf.doTheJob = function(docObject, next) {
  if (docObject.mimetype === 'application/pdf') {
    const popplonode = new Popplonode()
    popplonode.load(docObject.path);
    const metadata = popplonode.getMetadata()
    this.getPdfWordCount(popplonode, metadata.TotalNbPages).then(nbWords=>{
      docObject.pdfMetadata = metadata;
      docObject.pdfPageTotal = +metadata.TotalNbPages;
      docObject.pdfWordCount = +nbWords;
      docObject.pdfWordByPage = ~~(docObject.pdfWordCount / docObject.pdfPageTotal);
      next(null, docObject)
    })
  } else {
    next(null, docObject);
  }
};

sisyphePdf.getPdfWordCount = async function(popplonode, TotalNbPages) {
  const promises = []
  for (var i = 0; i < TotalNbPages; i++) {
    promises.push(new Promise(function(resolve, reject) {
      const text = popplonode.getTextFromPage(i, function(err,data){
        if (err) return reject(err)
        resolve(data)
      })
    }))
  }
  return bluebird.map(promises, function (data){
    return data.split(/\s+/).length
  }, {concurrency: 3}).then(data=>{
    let totalWords = 0
    data.map(data=>{
      return totalWords+=data
    })
    return totalWords
  }).catch(err=>{
    process.send({
      err:{
        message: 'lkklk'+ err.message
      }
    })
  })
}

//
// const result=[]
// let nb = 0
// function launch() {
//   return new Promise(function(resolve, reject) {
//     sisyphePdf.doTheJob({ corpusname: 'nature',
//       startAt: 1503575729241,
//       extension: '.pdf',
//       path: 'nature09919-s1.pdf',
//       name: 'nsmb0209-99.pdf',
//       size: 261775,
//       mimetype: 'application/pdf',
//       mimedetails: { encoding: 'binary', complete: 'PDF document, version 1.4' } },(err,data)=>{
//         if (err) {
//           sisyphePdf.docObject.err=err
//           result.push(sisyphePdf.docObject)
//         }
//         else result.push(data)
//         if (nb==10) return resolve(data)
//         nb++
//
//         launch().then(data=>{
//           resolve()
//         })
//       })
//   });
// }
//
// console.time('end')
//
// sisyphePdf.init()
// launch().then(_=>{
//   console.log('kl');
//   sisyphePdf.fork.kill('SIGTERM')
//   console.log(result);
//   console.timeEnd('end')
// })

module.exports = sisyphePdf;

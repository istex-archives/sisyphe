'use strict';

const chai = require('chai'),
      expect = chai.expect,
      Promise = require('bluebird'); 

const sisypheFileType = Promise.promisifyAll(require('../index.js')),

      xmlCorruptList = require('./xml-corrupt'),
      xmlInvalidList = require('./xml-invalid'),
      xmlValidList = require('./xml-valid'),

      pdfCorruptList = require('./pdf-corrupt'),
      pdfValidList = require('./pdf-valid');


/********/
/*  XML */
/********/
describe('Checking xml filetypes', () => {
  it('Should detect valid xml files', (done) => {
    Promise.map(xmlValidList, (elem) => {
      return sisypheFileType.doTheJobAsync(elem)
    }).map(elem=>{
      expect(elem).to.exist;
      expect(elem.mimetype).to.be.equal('application/xml')
    }).then(()=>{
      done()
    }).catch(err=>{
      done(err)
    })
  });
  it('Should detect not-well-formed xml files as application/xml', (done) => {
    Promise.map(xmlInvalidList, (elem) => {
      return sisypheFileType.doTheJobAsync(elem)
    }).map(elem=>{
      expect(elem).to.exist;
      expect(elem.mimetype).to.be.equal('application/xml')
    }).then(()=>{
      done()
    }).catch(err=>{
      done(err)
    })
  });
  it('Should detect corrupt xml files as octet-stream', (done) => {
    Promise.map(xmlCorruptList, (elem) => {
      return sisypheFileType.doTheJobAsync(elem)
    }).map(elem=>{
      expect(elem).to.exist;
      expect(elem.mimetype).to.be.equal('application/octet-stream')
    }).then(()=>{
      done()
    }).catch(err=>{
      done(err)
    })
  });
});

/********/
/*  PDF */
/********/
describe('Checking pdf filetypes', () => {
  it('Should detect valid pdf files', (done) => {
    Promise.map(pdfValidList, (elem) => {
      return sisypheFileType.doTheJobAsync(elem)
    }).map(elem=>{
      expect(elem).to.exist;
      expect(elem.mimetype).to.be.equal('application/pdf')
    }).then(()=>{
      done()
    }).catch(err=>{
      done(err)
    })
  });
  it('Should detect not-well-formed xml files as application/xml', (done) => {
    Promise.map(pdfCorruptList, (elem) => {
      return sisypheFileType.doTheJobAsync(elem)
    }).map(elem=>{
      expect(elem).to.exist;
      expect(elem.mimetype).to.be.equal('application/octet-stream')
    }).then(()=>{
      done()
    }).catch(err=>{
      done(err)
    })
  });
});

/********/
/* OTHER */
/********/
describe('Checking others kind of filetypes', () => {
  it('Should detect txt files',(done)=>{  
    sisypheFileType.doTheJob({path: "test/samples/others/fulltext.txt"}, (err,data)=>{
      try{
        expect(err).to.be.null;
        expect(data).to.exist;
        expect(data.mimetype).to.be.equal('text/plain');
        done();
      }catch(err){
        done(err);
      }
    });
  })
  it('Should detect a spoofed extension txt files',(done)=>{  
    sisypheFileType.doTheJob({path: "test/samples/others/fulltext.txtocr"}, (err,data)=>{
      try{
        expect(err).to.be.null;
        expect(data).to.exist;
        expect(data.mimetype).to.be.equal('text/plain');
        done();
      }catch(err){
        done(err);
      }
    });
  })
  it('Should detect java app files',(done)=>{  
    sisypheFileType.doTheJob({path: "test/samples/others/helloWorld.jar"}, (err,data)=>{
      try{
        expect(err).to.be.null;
        expect(data).to.exist;
        expect(data.mimetype).to.be.equal('application/java-archive');
        done();
      }catch(err){
        done(err);
      }
    });
  })
  it('Should detect gif pictures',(done)=>{  
    sisypheFileType.doTheJob({path: "test/samples/others/other.gif"}, (err,data)=>{
      try{
        expect(err).to.be.null;
        expect(data).to.exist;
        expect(data.mimetype).to.be.equal('image/gif');
        done();
      }catch(err){
        done(err);
      }
    });
  })
  it('Should detect zip files',(done)=>{  
    sisypheFileType.doTheJob({path: "test/samples/others/sample.zip"}, (err,data)=>{
      try{
        expect(err).to.be.null;
        expect(data).to.exist;
        expect(data.mimetype).to.be.equal('application/zip');
        done();
      }catch(err){
        done(err);
      }
    });
  })
});



'use strict';

const chai = require('chai'),
  exec = require('child_process').exec,
  DOMParser = require('xmldom').DOMParser,
  expect = chai.expect,
  sisypheXml = require('../index.js');

const baseDoc = {
  corpusname: 'default',
  mimetype: 'application/xml',
  startAt: 1479731952814,
  extension: '.xml',
  name: 'test-default.xml',
  size: 123
};

const doc = Object.assign({path: __dirname + '/data/test-default.xml'}, baseDoc);
const docWithBadDoctypeInXml = Object.assign({path: __dirname + '/data/test-bad-doctype.xml'}, baseDoc);
const docWithNotWellFormedXml = Object.assign({path: __dirname + '/data/test-not-wellformed.xml'}, baseDoc);
const docWithUnknownDoctype = Object.assign({path: __dirname + '/data/test-unknown-doctype.xml'}, baseDoc);
const docWithNotValidXml = Object.assign({path: __dirname + '/data/test-not-valid-dtd.xml'}, baseDoc);

describe('Dependancies', () => {
  it('should have acces to xmlstarlet', (done) => {
    exec('which xmlstarlet', (err, stdout, stderr) => {
      void expect(err).to.be.null;
      void expect(stderr).to.be.empty;
      void expect(stdout).to.be.not.null;
      done();
    });
  });
});

describe('doTheJob', function () {
  it('should add some info about a wellformed XML and valid DTD', function (done) {
    sisypheXml.doTheJob(doc, (error, docOutput) => {
      if (error) return done(error);
      expect(docOutput).to.have.property('isWellFormed');
      expect(docOutput.isWellFormed).to.be.a('boolean');
      expect(docOutput).to.have.property('doctype');
      expect(docOutput.doctype).to.be.a('object');
      expect(docOutput.doctype).to.have.property('sysid');
      expect(docOutput.doctype.sysid).to.be.a('string');
      expect(docOutput).to.have.property('someInfosIsValid');
      expect(docOutput).to.have.property('someInfosError');
      expect(docOutput).to.have.property('validationDTDInfos');
      expect(docOutput.validationDTDInfos).to.be.an('object');
      expect(docOutput.validationDTDInfos).to.have.property('dtd');
      expect(docOutput.validationDTDInfos).to.have.property('stdout');
      done();
    });
  });

  it('should add some info about a not wellformed XML', function (done) {
    sisypheXml.doTheJob(docWithNotWellFormedXml, (error, docOutput) => {
      if (error) return done(error);
      expect(docOutput).to.have.property('isWellFormed');
      expect(docOutput.isWellFormed).to.be.a('boolean');
      expect(docOutput).to.have.property('error');
      expect(docOutput.error).to.be.an.instanceof(Error);
      expect(docOutput.error.type).to.be.equal('wellFormed');
      done();
    });
  });

  it('should add some info about a XML whith bad doctype', function (done) {
    sisypheXml.doTheJob(docWithBadDoctypeInXml, (error, docOutput) => {
      if (error) return done(error);
      expect(docOutput).to.have.property('isWellFormed');
      expect(docOutput.isWellFormed).to.be.a('boolean');
      expect(docOutput).to.have.property('error');
      expect(docOutput.error).to.be.an.instanceof(Error);
      expect(docOutput.error.type).to.be.equal('doctype');
      done();
    });
  });

  it('should add some info about a XML whith an unknown doctype but valid after all', function (done) {
    sisypheXml.doTheJob(docWithUnknownDoctype, (error, docOutput) => {
      if (error) return done(error);
      expect(docOutput).to.have.property('isWellFormed');
      expect(docOutput.isWellFormed).to.be.a('boolean');
      expect(docOutput).to.have.property('validationDTDInfos');
      expect(docOutput.validationDTDInfos).to.be.an('object');
      expect(docOutput.validationDTDInfos).to.have.property('dtd');
      expect(docOutput.validationDTDInfos).to.have.property('stdout');
      done();
    });
  });

  it('should add some info about a not valid XML', function (done) {
    sisypheXml.doTheJob(docWithNotValidXml, (error, docOutput) => {
      if (error) return done(error);
      expect(docOutput).to.have.property('isWellFormed');
      expect(docOutput.isWellFormed).to.be.a('boolean');
      expect(docOutput).to.have.property('error');
      expect(docOutput.error).to.be.an.instanceof(Error);
      expect(docOutput.error.type).to.be.equal('validation-dtd');
      done();
    });
  })

});

describe('getXmlDom', function () {
  it('should get xml DOM from a wellformed xml file', function () {
    return sisypheXml.getXmlDom(doc.path).then((xmlDom) => {
      expect(xmlDom).to.be.an('object');
    })
  });

  it('should catch an error from a not wellformed xml file', function () {
    return sisypheXml.getXmlDom(docWithNotWellFormedXml.path).catch((error) => {
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('type');
      expect(error.type).to.equal('wellFormed');
      expect(error).to.have.property('list');
      expect(error.list).to.be.an('Array');
    })
  })
});

describe('getDoctype', function () {
  it('should get a doctype from a xml file with a good structured doctype', function () {
    return sisypheXml.getDoctype(doc.path).then((doctype) => {
      expect(doctype).to.be.an('object');
      expect(doctype).to.have.property('type');
      expect(doctype).to.have.property('name');
      expect(doctype).to.have.property('pubid');
      expect(doctype).to.have.property('sysid');
    })
  });

  it('should get a doctype from a xml file with a bad structured doctype', function () {
    return sisypheXml.getDoctype(docWithBadDoctypeInXml.path).catch((error) => {
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('type');
      expect(error.type).to.equal('doctype');
    })
  })
});


describe('getConf', function () {
  it('should get a object conf from a config file', function () {
    return sisypheXml.getConf('default').then((defaultConfObj) => {
      expect(defaultConfObj).to.be.an('object');
    })
  })
});

describe('checkConf', function () {
  it('should check a correct config file', function () {
    const confObjInput = {
      "metadata": [
        {
          "name": "someInfos",
          "regex": "^([a-z]{8})$",
          "type": "String",
          "xpath": "/xpath/to/my/infos/text()"
        }
      ]
    };
    return sisypheXml.checkConf(confObjInput).then((confObjOuput) => {
      expect(confObjInput).to.be.equal(confObjOuput);
    });
  });

  it('should catch an error with wrong config file', function () {
    const confObjInput = {
      "metadata": [
        {
          "singing": "in the rain",
          "wtf": "dude",
        }
      ]
    };
    return sisypheXml.checkConf(confObjInput).catch((error) => {
      expect(error).to.be.an('object');
      expect(error.name).to.be.equal('AssertionError');
    });
  })

});

describe('getMetadataInfos', function () {
  it('should get metadata informations with a config file', function () {
    const confObjInput = {
      "metadata": [
        {
          "name": "someInfos",
          "regex": "^([a-z]{8})$",
          "type": "String",
          "xpath": "/xpath/to/my/infos/text()"
        }, {
          "name": "myNumber",
          "regex": "^([1-9]{4})$",
          "type": "Number",
          "xpath": "/xpath/to/my/number/text()"
        }, {
          "name": "noInfo",
          "regex": "^([a-z]{8})$",
          "type": "String",
          "xpath": "/xpath/to/nowhere/text()"
        }
      ]
    };
    const xmlData = `
    <?xml version="1.0" encoding="UTF-8"?>
    <xpath>
    <to>
        <my>
            <infos>trezaq</infos>
            <number>1234</number>
        </my>
    </to>
    </xpath>
    `;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData);
    sisypheXml.getMetadataInfos(confObjInput, xmlDoc).map((metadata) => {
      expect(metadata).to.have.property('name');
      expect(metadata).to.have.property('type');
      if (metadata.hasOwnProperty('regex')) {
        expect(metadata.regex).to.be.a('string');
      }
      if (metadata.hasOwnProperty('value')) {
        expect(metadata.value).to.be.a('string');
      }
    })
  })
});

describe('validateAgainstDTD', function () {
  it('should validate the Xml file from a docObject and a dtd list who contains a good DTD', function () {
    doc.doctype = { type: 'PUBLIC',
      name: 'article',
      pubid: 'my doctype of doom',
      sysid: 'mydoctype.dtd' };
    const arrayPathDTD = ['test/dtd/myBADdoctype.dtd', 'test/dtd/mydoctype.dtd'];
    return sisypheXml.validateAgainstDTD(doc, arrayPathDTD).then((result) => {
      expect(result).to.be.an('object');
      expect(result).to.have.property('dtd');
      expect(result).to.have.property('stdout');
    })
  });

  it('should catch an error when tries to validate a xml file from a docObject and a dtd list who contains only a bad DTD', function () {
    const arrayPathDTD = ['test/dtd/myBADdoctype.dtd'];
    doc.doctype = { type: 'PUBLIC',
      name: 'article',
      pubid: 'my doctype of doom',
      sysid: 'mydoctype.dtd' };
    return sisypheXml.validateAgainstDTD(doc, arrayPathDTD).catch((error) => {
      expect(error).to.be.an.instanceof(Error);
    })
  })
});
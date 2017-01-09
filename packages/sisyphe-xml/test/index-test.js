'use strict';

const chai = require('chai'),
  DOMParser = require('xmldom').DOMParser,
  expect = chai.expect,
  sisypheXml = require('../index.js');

const dataInput = {
  corpusname: 'default',
  mimetype: 'application/xml',
  startAt: 1479731952814,
  extension: '.xml',
  path: __dirname + '/data/test-default.xml',
  name: 'test-default.xml',
  size: 123
};

const badDataInput = {
  corpusname: 'default',
  mimetype: 'application/xml',
  startAt: 1479731952814,
  extension: '.xml',
  path: __dirname + '/data/test-bad-default.xml',
  name: 'test-default.xml',
  size: 123
};


// describe('doTheJob', function () {
//   it('should add some info about the XML whithout config', function (done) {
//     sisypheXml.doTheJob(dataInput, (error, dataOutput) => {
//       if (error) return done(error);
//       expect(dataOutput).to.have.property('isWellFormed');
//       expect(dataOutput.isWellFormed).to.be.a('boolean');
//       expect(dataOutput).to.have.property('doctype');
//       expect(dataOutput.doctype).to.be.a('object');
//       expect(dataOutput.doctype).to.have.property('sysid');
//       expect(dataOutput.doctype.sysid).to.be.a('string');
//       expect(dataOutput).to.have.property('someInfosIsValid');
//       expect(dataOutput).to.have.property('someInfosError');
//       done();
//     });
//   })
// });

describe('getXmlDom', function () {
  it('should get xml DOM from a wellformed xml file', function () {
    return sisypheXml.getXmlDom(dataInput.path).then((xmlDom) => {
      expect(xmlDom).to.be.an('object');
    })
  });

  it('should catch error from a not wellformed xml file', function () {
    return sisypheXml.getXmlDom(badDataInput.path).catch((error) => {
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
    return sisypheXml.getDoctype(dataInput.path).then((doctype) => {
      expect(doctype).to.be.an('object');
      expect(doctype).to.have.property('type');
      expect(doctype).to.have.property('name');
      expect(doctype).to.have.property('pubid');
      expect(doctype).to.have.property('sysid');
    })
  });

  it('should get a doctype from a xml file with a bad structured doctype', function () {
    return sisypheXml.getDoctype(badDataInput.path).catch((error) => {
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
    return sisypheXml.checkConf(confObjInput).then((confIsValid) => {
      expect(confIsValid).to.be.true;
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
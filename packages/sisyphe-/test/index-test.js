'use strict';

const chai = require('chai'),
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

describe('doTheJob', function () {
  it('should add some info about the XML whithout config', function (done) {
    sisypheXml.doTheJob(dataInput, (error, dataOutput) => {
      if (error) return done(error);
      expect(dataOutput).to.have.property('isWellFormed');
      expect(dataOutput.isWellFormed).to.be.a('boolean');
      expect(dataOutput).to.have.property('doctype');
      expect(dataOutput.doctype).to.be.a('object');
      expect(dataOutput.doctype).to.have.property('sysid');
      expect(dataOutput.doctype.sysid).to.be.a('string');
      done();
    });
  })
});

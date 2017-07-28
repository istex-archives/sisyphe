'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const monitor = require('../src/monitor');
const Queue = require('bull');

describe(`${pkg.name}/src/monitor.js`, function () {
  describe('#init', function () {
    it('should be initialized successfully', function () {
      const monitorTest = Object.create(monitor)
      monitorTest.init({prefix:'bull', refresh: 1000})
      expect(monitorTest.refresh).to.be.a('number')
      expect(monitorTest.prefix).to.be.a('string')
      expect(monitorTest.monitorController).to.be.an('object')
      expect(monitorTest.workers).to.be.an('array').to.be.empty
    });
  });
  describe('#launch', function () {
    it('should be initialized successfully', function () {
      const monitorTest = Object.create(monitor)
      monitorTest.init({prefix:'bull', refresh: 1000}).launch()

    });
  });
});


function loadQueue()
  const prefix = 'sisyphe'
  const filetype = new Queue("filetype", {
    prefix
  });
  const xml = new Queue("xml", {
    prefix
  });
  const walker = new Queue("walker-fs", {
    prefix
  });


  const nbDocs = 800
  for (var i = 0; i < nbDocs; i++) {
    await walker.add({
      id: ~~(Math.random() * 100)
    });
  }

  for (var i = 0; i < nbDocs; i++) {
    await filetype.add({
      id: ~~(Math.random() * 100)
    });
  }
  for (var i = 0; i < nbDocs; i++) {
    await xml.add({
      id: ~~(Math.random() * 100)
    });
  }
  return process(xml).then(_ => {
      log('xml')
      return process(filetype)
    }).then(_=>{
      log('filetype')
    })

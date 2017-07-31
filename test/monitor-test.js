'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const monitor = require('../src/monitor');
const Queue = require('bull');

describe(`${pkg.name}/src/monitor.js`, function() {
  describe('#init', function() {
    it('should be initialized successfully', function() {
      const monitorTest = new monitor()
      monitorTest.init({
        prefix: 'testMonitor',
        refresh: 10,
        silent: true
      })

      expect(monitorTest).to.be.an.instanceof(monitor)
      expect(monitorTest.refresh).to.be.a('number')
      expect(monitorTest.prefix).to.be.a('string')
      expect(monitorTest.workers).to.be.an('array').to.be.empty
    });
  });
  describe('#launch', function() {
    it('should be launch successfully', function(done) {
      let monitorTest = new monitor()
      monitorTest = monitorTest.init({
        prefix: 'testMonitor',
        refresh: 10,
        silent: true
      }).launch()
      expect(monitorTest.intervalLoop).to.be.an('object').to.have.ownPropertyDescriptor('_idleTimeout', {
        value: 40,
        writable: true,
        enumerable: true,
        configurable: true
      })
      done()
    });
  });
  describe('#exit', function() {
    it('timer should be broken', function(done) {
      let monitorTest = new monitor()
      monitorTest = monitorTest.init({
        prefix: 'testMonitor',
        refresh: 10,
        silent: true
      }).launch().exit()
      expect(monitorTest.intervalLoop).to.be.an('object').to.have.ownPropertyDescriptor('_idleTimeout', {
        value: -1,
        writable: true,
        enumerable: true,
        configurable: true
      })
      done()
    });
  });
});

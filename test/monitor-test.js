'use strict';

const pkg = require('../package.json');
const Promise = require('bluebird');
const chai = require('chai');
const expect = chai.expect;
const monitor = require('../src/monitor');
const Queue = require('bull');

const redis = require("redis")
const client = redis.createClient();


beforeEach(function() {
  return new Promise(function(resolve, reject) {
    client.flushall((err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  });
});



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
  describe('#getKeys', function() {
    it('all workers should be found', function(done) {
      const workers = ['filetype', 'xml', 'walker']
      Promise.mapSeries(workers, worker => {
        return new Queue(worker, {
          prefix: 'testMonitor'
        });
      }).mapSeries(async worker => {
        const nbDocs = 32
        for (var i = 0; i < nbDocs; i++) {
          await worker.add({
            id: ~~(Math.random() * 100)
          });
        }
        return worker
      }).then(workers => {
        let monitorTest = new monitor()
        monitorTest = monitorTest.init({
          prefix: 'testMonitor',
          refresh: 10,
          silent: true
        }).launch()
        setTimeout(function() {
          console.log(workers[0].name);
          expect(monitorTest.workers).to.be.an('array').to.have.lengthOf(3)
          expect(monitorTest.workers[0]).to.be.an('object').to.have.ownPropertyDescriptor('name')
          done()
        }, 100);
      })
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

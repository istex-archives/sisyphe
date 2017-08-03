'use strict';

const pkg = require('../package.json');
const Promise = require('bluebird');
const chai = require('chai');
const expect = chai.expect;
const monitor = require('../src/monitor');
const monitorController = require('../src/monitor/monitorController');
const monitorHelpers = require('../src/monitor/monitorHelpers');
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
      const monitorTest = new monitor({
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
      let monitorTest = new monitor({
        prefix: 'testMonitor',
        refresh: 10,
        silent: true
      }).launch()
      expect(monitorTest.intervalLoop).to.be.an('object').own.property('_idleTimeout', 40)
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
      }).then(async workers => {
        const startQueue = new Queue('start', {
          prefix: 'testMonitor'
        });
        await startQueue.add({
          id: ~~(Math.random() * 100)
        })
        let monitorTest = new monitor({
          prefix: 'testMonitor',
          refresh: 10
        }).launch()
        setTimeout(function() {
          expect(monitorTest.workers).to.be.an('array').to.have.lengthOf(4)
          expect(monitorTest.workers[0]).to.be.an('object').own.property('name')
          done()
        }, 200);
      })
    });
  });
});


describe(`${pkg.name}/src/monitor/monitorController.js`, function() {
  describe('#init', function() {
    it('should be initialized successfully', function() {
      let monitorControllerTest = new monitorController()
      expect(monitorControllerTest.screen).to.be.an('Object')
      expect(monitorControllerTest.grid).to.be.an('Object')

      expect(monitorControllerTest.workersView).to.be.an('Object')
      expect(monitorControllerTest.workersView).own.property('walker')
      expect(monitorControllerTest.workersView).own.property('waitingModules')
      expect(monitorControllerTest.workersView).own.property('doneModules')
      expect(monitorControllerTest.workersView).own.property('currentModule')
      expect(monitorControllerTest.workersView).own.property('progress')
      expect(monitorControllerTest.workersView).own.property('total')
      expect(monitorControllerTest.workersView).own.property('time')
      expect(monitorControllerTest.workersView).own.property('logs')
      expect(monitorControllerTest.workersView).own.property('question')

      expect(monitorControllerTest.workersData).to.be.an('Object')
      expect(monitorControllerTest.workersData).own.property('waitingModules')
      expect(monitorControllerTest.workersData).own.property('doneModules')
      expect(monitorControllerTest.workersData).own.property('currentModule')

      expect(monitorControllerTest.maxFile).to.be.an('number')
        .to.equal(0)

      expect(monitorControllerTest.listWorkers).to.be.an('Array').to.be.empty
    });
  });
  describe('#refresh', function() {
    it('should be refresh successfully', function() {
      const data = [{
        waiting: 10,
        failed: 0,
        name: 'filetype',
        maxFile: 1600
      }, {
        waiting: 0,
        failed: 0,
        name: 'xml',
        maxFile: 1600
      }]
      let monitorControllerTest = new monitorController().refresh({
        data
      })
      expect(monitorControllerTest.workersData.currentModule).to.be.an('object')
      expect(monitorControllerTest.workersData.currentModule).own.property('name', 'None')
      expect(monitorControllerTest.workersData.currentModule).own.property('waiting', '')
      expect(monitorControllerTest.workersData.currentModule).own.property('failed', '')

      expect(monitorControllerTest.workersData.waitingModules).to.be.an('object')
      expect(monitorControllerTest.workersData.waitingModules).own.property('filetype')
      expect(monitorControllerTest.workersData.waitingModules.filetype).own.property('name', 'filetype')
      expect(monitorControllerTest.workersData.waitingModules.filetype).own.property('waiting', 10)
      expect(monitorControllerTest.workersData.waitingModules.filetype).own.property('failed', 0)

      expect(monitorControllerTest.workersData.doneModules).to.be.an('object')
      expect(monitorControllerTest.workersData.doneModules).own.property('xml')
      expect(monitorControllerTest.workersData.doneModules.xml).own.property('name', 'xml')
      expect(monitorControllerTest.workersData.doneModules.xml).own.property('waiting', 0)
      expect(monitorControllerTest.workersData.doneModules.xml).own.property('failed', 0)

      expect(monitorControllerTest.maxFile).to.equal(1600)

      data[0].waiting = 9
      monitorControllerTest.refresh({
        data
      })
      expect(monitorControllerTest.workersData.currentModule).to.be.an('object')
      expect(monitorControllerTest.workersData.currentModule).own.property('name', 'filetype')
      expect(monitorControllerTest.workersData.currentModule).own.property('waiting', 9)
      expect(monitorControllerTest.workersData.currentModule).own.property('failed', 0)

      expect(monitorControllerTest.workersData.waitingModules).to.be.an('object')
      expect(monitorControllerTest.workersData.waitingModules).to.not.have.own.property('filetype')

      expect(monitorControllerTest.workersData.doneModules).to.be.an('object')
      expect(monitorControllerTest.workersData.doneModules).own.property('xml')
      expect(monitorControllerTest.workersData.doneModules.xml).own.property('name', 'xml')
      expect(monitorControllerTest.workersData.doneModules.xml).own.property('waiting', 0)
      expect(monitorControllerTest.workersData.doneModules.xml).own.property('failed', 0)

      monitorControllerTest.refresh({
        data
      })
      expect(monitorControllerTest.workersData.currentModule).to.be.an('object')
      expect(monitorControllerTest.workersData.currentModule).own.property('name', 'filetype')
      expect(monitorControllerTest.workersData.currentModule).own.property('waiting', 9)
      expect(monitorControllerTest.workersData.currentModule).own.property('failed', 0)

      expect(monitorControllerTest.workersData.waitingModules).to.be.an('object')
      expect(monitorControllerTest.workersData.waitingModules).to.not.have.own.property('filetype')

      expect(monitorControllerTest.workersData.doneModules).to.be.an('object')
      expect(monitorControllerTest.workersData.doneModules).own.property('xml')
      expect(monitorControllerTest.workersData.doneModules.xml).own.property('name', 'xml')
      expect(monitorControllerTest.workersData.doneModules.xml).own.property('waiting', 0)
      expect(monitorControllerTest.workersData.doneModules.xml).own.property('failed', 0)
    });
  });
});


describe(`${pkg.name}/src/monitor/monitorHelpers.js`, function() {
  describe('#propertyToArray', function() {
    it('should convert properties to an array', function() {
      const arrayFromObject = monitorHelpers.propertyToArray({
        one: "",
        two: ['twoBis', 'twoTer'],
        three: {
          threeBis: ''
        }
      })
      expect(arrayFromObject).to.be.an('array').to.have.lengthOf(3)
      expect(arrayFromObject[0]).to.include('one')
      expect(arrayFromObject[1]).to.include('two')
      expect(arrayFromObject[2]).to.include('three')
    });
  });
  describe('#getColorOfPercent', function() {
    it('should return a color', function() {
      for (var i = 0; i < 102; i++) {
        expect(monitorHelpers.getColorOfPercent(i)).to.be.a('string')
      }
    });
  });
  describe('#nbProperty', function() {
    it('should return nb of property', function() {
      expect(monitorHelpers.nbProperty({
        one: "",
        two: ['twoBis', 'twoTer'],
        three: {
          threeBis: ''
        }
      })).to.equal(3)
    });
  });
});

'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const path = require('path');
const Manufactory = require('../src/manufactory');

describe(`${pkg.name}/src/manufactory.js`, function () {
  this.timeout(20000);
  describe('#init', function () {
    it('should be initialized successfully', function () {
      const enterprise = Object.create(Manufactory);
      enterprise.init();
      expect(enterprise.workers).to.be.an('array');
      expect(enterprise.workers).to.be.empty;
      expect(enterprise.pathToAnalyze).to.be.a('string');
      expect(enterprise.numCPUs).to.be.a('number');
    });
  });

  describe('#createDispatchers', function () {
    it('should create dispatchers for each workers', function () {
      const enterprise = Object.create(Manufactory);
      enterprise.init().addWorker('dumbWorker').createDispatchers();
      expect(enterprise.dispatchers).to.be.an('array');
      expect(enterprise.dispatchers).to.have.lengthOf(1);
    });
  });

  describe('#createOverseersForDispatchers', function () {
    it('should create overseers for each dispatchers', function () {
      const enterprise = Object.create(Manufactory);
      return enterprise
        .init()
        .addWorker('walker-fs')
        .addWorker('dumbWorker')
        .createDispatchers()
        .createOverseersForDispatchers()
        .then(results => {
          expect(results).to.be.an('array');
          expect(results).to.have.lengthOf(2);
          results.map(result => {
            expect(result).to.be.an('array');
            expect(result).to.have.lengthOf(enterprise.numCPUs);
          });
          enterprise.dispatchers.map(dispatcher => {
            expect(dispatcher.waitingQueue).to.have.lengthOf(enterprise.numCPUs);
          });
        });
    });
  });

  describe('#bindDispatchers', function () {
    it('should bind dispatchers between them', function () {
      const enterprise = Object.create(Manufactory);
      return enterprise
        .init()
        .addWorker('walker-fs')
        .addWorker('dumbWorker')
        .createDispatchers()
        .createOverseersForDispatchers()
        .then(() => {
          enterprise.bindDispatchers();
          enterprise.dispatchers.map((dispatcher, index, array) => {
            const isLastDispatcher = array.length === index + 1;
            const isFirstDispatcher = index === 0;
            if (isLastDispatcher || isFirstDispatcher) {
              expect(dispatcher.listenerCount('result')).to.equal(0);
            } else {
              expect(dispatcher.listenerCount('result')).to.equal(1);
            }
          });
        });
    });
  });

  describe('#initializeWorkers', function () {
    it('should initialize workers', function () {
      const enterprise = Object.create(Manufactory);
      return enterprise.init().addWorker('walker-fs').addWorker('dumbWorker').initializeWorkers().then(() => {
        enterprise.dispatchers.map((dispatcher, index, array) => {
          const isLastDispatcher = array.length === index + 1;
          const isFirstDispatcher = index === 0;
          if (isLastDispatcher || isFirstDispatcher) {
            expect(dispatcher.listenerCount('result')).to.equal(0);
          } else {
            expect(dispatcher.listenerCount('result')).to.equal(1);
          }
        });
      });
    });
  });

  describe('#start', function () {
    this.timeout(5000);
    it('should start manufactory', function (done) {
      const enterprise = Object.create(Manufactory);
      const inputPath = path.join(__dirname, '/data');
      const numCPUs = 2;
      enterprise
        .init({ inputPath, numCPUs })
        .addWorker('walker-fs')
        .addWorker('dumbWorker')
        .initializeWorkers()
        .then(() => {
          let firstresult = true;
          enterprise.dispatchers[1].on('result', msg => {
            expect(msg).to.have.property('type');
            expect(msg).to.have.property('data');
            expect(msg.data).to.be.an('object');
            if (firstresult) {
              firstresult = false;
              done();
            }
          });
          return enterprise.start();
        });
    });
  });

  describe('#final', function () {
    this.timeout(5000);
    it('should fire finalJobs', function () {
      const enterprise = Object.create(Manufactory);
      const inputPath = path.join(__dirname, '/data');
      const numCPUs = 2;
      return enterprise
        .init({ inputPath, numCPUs })
        .addWorker('walker-fs')
        .addWorker('dumbWorker')
        .initializeWorkers()
        .then(() => {
          return enterprise.final();
        });
    });
  });
});

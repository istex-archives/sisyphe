'use strict';

const pkg = require('./../package.json'),
  chai = require('chai'),
  expect = chai.expect,
  Queue = require('bull'),
  ChainJobQueue = require('./../src/chain-job-queue');

describe(pkg.name + '/src/chain-job-queue.js', function () {
  describe('constructor', function () {
    it('Should initialize some variables', function () {
      const chain = new ChainJobQueue();
      void expect(chain.listWorker).to.be.an('array');
      void expect(chain.listWorker).to.be.empty;
    })
  });

  describe('addWorker', function () {
    it('Should add a new Worker', function () {
      const chain = new ChainJobQueue();
      chain.addWorker('New Worker', (data, done) => {
        setTimeout(() => {
          done();
        }, data.time);
      });
      expect(chain.listWorker).to.have.lengthOf(1);
      chain.addWorker('Another Worker', (data, done) => {
        setTimeout(() => {
          done();
        }, data.time);
      });
      expect(chain.listWorker).to.have.lengthOf(2);
    })
  });

  describe('createQueueForWorkers', function () {
    it('should crate queues for all workers', function () {
      const chain = new ChainJobQueue();
      chain.addWorker('first-worker', {
        doTheJob: function (data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(1);
            next(null, data);
          }, data.time);
        }
      }, {
        corpus: 'corpus-test'
      }).addWorker('second-worker', {
        doTheJob: function (data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(2);
            next(null, data);
          }, data.time);
        }
      }, {
        corpus: 'corpus-test'
      }).createQueueForWorkers().listWorker.map((worker) => {
        expect(worker.name).to.be.a('string');
        expect(worker.totalPerformedTask).to.be.a('number');
        expect(worker.totalFailedTask).to.be.a('number');
        expect(worker.features).to.be.a('object');
        expect(worker.options.corpus).to.equal('corpus-test');
        expect(worker.queue).to.be.an.instanceof(Queue);
        worker.queue.close();
      });
    })
  });

  describe('initializeFeaturesWorkers', function () {
    it('should initialize features function for all workers', function () {
      const chain = new ChainJobQueue();
      chain.addWorker('first-worker', {
        doTheJob: function (data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(1);
            next(null, data);
          }, data.time);
        }
      }).addWorker('second-worker', {
        doTheJob: function (data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(2);
            next(null, data);
          }, data.time);
        }
      }).initializeFeaturesWorkers().listWorker.map((worker) => {
        expect(worker.name).to.be.a('string');
        expect(worker.totalPerformedTask).to.be.a('number');
        expect(worker.totalFailedTask).to.be.a('number');
        expect(worker.features).to.be.a('object');
        expect(worker.options).to.be.a('undefined');
      });
    })
  });

  describe('addJobProcessToWorkers', function () {
    it('should add the function job processing for all workers', function () {
      const chain = new ChainJobQueue();
      chain.addWorker('first-worker', {
        doTheJob: function (data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(1);
            next(null, data);
          }, data.time);
        }
      }).addWorker('second-worker', {
        doTheJob: function (data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(2);
            next(null, data);
          }, data.time);
        }
      }).createQueueForWorkers().addJobProcessToWorkers().listWorker.map((worker) => {
        expect(worker.queue._events.failed).to.be.a('function');
        expect(worker.queue._events.completed).to.be.a('function');
        expect(worker.queue._events.stalled).to.be.a('function');
        expect(worker.queue._events.error).to.be.a('function');
        expect(worker.name).to.be.a('string');
        expect(worker.totalPerformedTask).to.be.a('number');
        expect(worker.totalFailedTask).to.be.a('number');
        expect(worker.features).to.be.a('object');
        expect(worker.features.doTheJob).to.be.a('function');
        expect(worker.options).to.be.a('undefined');
        expect(worker.queue).to.be.an.instanceof(Queue);
        worker.queue.close();
      });
    })
  });

  describe('addTask', function () {
    it('Should add a task and start to work on it', function (done) {
      const chain = new ChainJobQueue();
      chain.addWorker('first-worker', {
        doTheJob: function (data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(1);
            next(null, data);
          }, data.time);
        }
      }).addWorker('second-worker', {
        doTheJob: function (data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(2);
            next(null, data);
          }, data.time);
        }
      }).createQueueForWorkers()
        .initializeFeaturesWorkers()
        .addJobProcessToWorkers()
        .addTask({
          message: 'Première tache',
          count: 0,
          time: 10
        });

      const lastWorker = chain.listWorker[chain.listWorker.length - 1];
      lastWorker.queue.on('completed', () => {
        const closeWorker = chain.listWorker.map((worker) => worker.close);
        Promise.all(closeWorker).then(() => {
          done()
        });
      });
    });
  })
});
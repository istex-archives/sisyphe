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

  describe('initialize', function () {
    it('Should instances and initialize workers', function (done) {
      const chain = new ChainJobQueue();
      chain.addWorker('First Worker', (data, done) => {
        setTimeout(() => {
          console.log('First Worker', data);
          done();
        }, data.time);
      }).addWorker('Second Worker', (data, done) => {
        setTimeout(() => {
          console.log('Second Worker', data);
          done();
        }, data.time);
      }).initialize();
      chain.listWorker.forEach((worker) => {
        expect(worker.queue).to.be.an.instanceof(Queue);
        worker.queue.close();
      });
      done();
    });
  });

  describe('addTask', function () {
    it('Should add a task and start to work on it', function (done) {
      const chain = new ChainJobQueue();
      chain.addWorker('first-worker', {
        doTheJob: function(data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(1);
            next(null, data);
          }, data.time);
        }
      }).addWorker('second-worker', {
        doTheJob: function(data, next) {
          setTimeout(() => {
            data.count++;
            expect(data.count).to.equal(2);
            next(null, data);
          }, data.time);
        }
      }).initialize()
        .addTask({
          message: 'Première tache',
          count: 0,
          time: 100
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
'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Promise = require('bluebird');
const Dispatcher = require('../src/dispatcher');
const Overseer = require('../src/overseer');
const Task = require('../src/task');

describe(`${pkg.name}/src/dispatcher.js`, function () {
  describe('#init', function () {
    it('should be initialized successfully', function (done) {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      task.init({
        name: 'test-dispatcher-init'
      });
      ventilator.init(task, {
        name: 'test-dispatcher-init'
      });
      expect(Object.getPrototypeOf(ventilator.tasks)).to.equal(Task);
      expect(ventilator.options).to.be.an('object');
      expect(ventilator.waitingQueue).to.be.an('array');
      expect(ventilator.patients).to.be.an('array');
      ventilator.on('error', error => {
        expect(error).to.equal('error');
        done();
      });
      ventilator.tasks.queue.emit('failed', {}, 'error');
    });
  });

  describe('#stillJobToDo', function () {
    it('should stop dispatcher', function (done) {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      task.init({
        name: 'test-dispatcher-stop'
      });
      ventilator.init(task, {
        name: 'test-dispatcher-stop'
      });
      ventilator.stillJobToDo(done);
    });
  });

  describe('#addPatient', function () {
    it('should add a overseer', function (done) {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      task.init({
        name: 'test-dispatcher-addPatient'
      });
      ventilator.init(task, {
        name: 'test-dispatcher-addPatient'
      });
      const overseer = Object.create(Overseer);
      overseer.init('dumbWorker').then(() => {
        ventilator.addPatient(overseer);
        ventilator.on('error', error => {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.equal('this is just a test');
          done();
        });
        ventilator.patients[0].fork.emit('message', { type: 'error', message: 'this is just a test' });
      });
    });
  });

  describe('#getPatient', function () {
    it("should return a overseer when it's ready", function () {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      task.init({ name: 'test-dispatcher-getPatient' });
      ventilator.init(task, { name: 'test-dispatcher-getPatient' });
      const overseer1 = Object.create(Overseer);
      const overseer2 = Object.create(Overseer);
      setTimeout(() => {
        ventilator.addPatient(overseer2);
      }, 200);
      return Promise.all([overseer1.init('dumbWorker'), overseer2.init('dumbWorker')])
        .then(() => {
          ventilator.addPatient(overseer1);
          return ventilator.getPatient();
        })
        .then(overseer => {
          expect(overseer).to.be.an('object');
          expect(overseer).to.have.property('send');
          return ventilator.getPatient();
        })
        .then(overseer => {
          expect(overseer).to.be.an('object');
          expect(overseer).to.have.property('send');
        })
        .catch(error => {
          expect(error).to.be.null;
        });
    });
  });

  describe('#start', function () {
    this.timeout(5000);
    it('should start and dispatch tasks', function () {
      const doc = Object.create(Task);
      doc.init({
        name: 'test-dispatcher-start'
      });
      for (let i = 0; i < 32; i++) {
        doc.add({
          id: i,
          type: 'pdf'
        });
      }

      const ventilator = Object.create(Dispatcher);
      ventilator.init(doc, {
        name: 'test-dispatcher-start'
      });
      ventilator.on('result', data => {
        expect(data).to.be.an('object');
        expect(data.type).to.equal('job');
      });

      const overseers = [];
      for (let i = 0; i < 4; i++) {
        overseers.push(Object.create(Overseer));
      }
      return Promise.map(overseers, (overseer) => {
        return overseer.init('dumbWorker')  ;
      }).map((overseer) => {
        ventilator.addPatient(overseer);
      }).then(() => {
        return ventilator.start();
      });
    });
  });

  describe('#exit', function () {
    it('should ressurect a dead patient', function (done) {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      task.init({ name: 'test-dispatcher-exit' });
      ventilator.init(task, { name: 'test-dispatcher-exit' });
      const overseer = Object.create(Overseer);
      ventilator.on('error', error => {
        expect(error).to.be.an('object');
        expect(error).to.have.property('message');
        expect(error.message).to.be.an('string');
        expect(error).to.have.property('stack');
        expect(error.stack).to.be.an('string');
        expect(error).to.have.property('infos');
        expect(error.infos).to.be.an('object');
        done();
      });
      overseer.init('dumbWorker').then(() => {
        ventilator.addPatient(overseer);
        overseer.fork.kill('SIGSEGV');
        overseer.fork.signalCode = 'SIGSEGV';
        return ventilator.exit('SIGSEGV');
      });
    });
  });

  describe('#extractDeadPatient', function () {
    it('should extract a dead patient from a patient list', function () {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      task.init({ name: 'test-dispatcher-exit' });
      ventilator.init(task, { name: 'test-dispatcher-exit' });
      const overseer = Object.create(Overseer);
      return overseer.init('dumbWorker').then(() => {
        ventilator.addPatient(overseer);
        overseer.fork.kill('SIGSEGV');
        overseer.fork.signalCode = 'SIGSEGV';
        const deadPatient = ventilator.extractDeadPatient();
        expect(deadPatient).to.be.an('object');
        expect(deadPatient.workerType).to.equal('dumbWorker');
        expect(deadPatient.options).to.be.undefined;
        expect(deadPatient.fork).to.be.an('object');
        expect(deadPatient.dataProcessing).to.be.an('object');
      });
    });
  });

  describe('#resurrectPatient', function () {
    it('should resuscitate a dead patient from a patient list', function () {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      let deadPatient;
      task.init({ name: 'test-dispatcher-exit' });
      ventilator.init(task, { name: 'test-dispatcher-exit' });
      const overseer = Object.create(Overseer);
      return overseer.init('dumbWorker').then(() => {
        ventilator.addPatient(overseer);
        overseer.fork.kill('SIGSEGV');
        overseer.fork.signalCode = 'SIGSEGV';
        deadPatient = ventilator.extractDeadPatient();
        return ventilator.resurrectPatient(deadPatient);
      }).then(() => {
        expect(ventilator.patients).to.have.lengthOf(1);
        expect(ventilator.patients[0]).to.not.equal(deadPatient);
      });
    });
  });
});

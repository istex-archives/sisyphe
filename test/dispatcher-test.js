'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Dispatcher = require('../src/dispatcher');
const Overseer = require('../src/overseer');
const Task = require('../src/task');

describe(`${pkg.name}/src/dispatcher.js`, function () {
  describe('#init', function () {
    it('should be initialized successfully', function () {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      ventilator.init(task, {
        name: 'test-dispatcher-init'
      });
      expect(ventilator.tasks).to.be.an('object');
      expect(ventilator.options).to.be.an('object');
      expect(ventilator.waitingQueue).to.be.an('array');
    });
  });

  describe('#stop', function () {
    it('should stop dispatcher', function (done) {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      task.init({
        name: 'test-dispatcher-stop'
      });
      ventilator.init(task, {
        name: 'test-dispatcher-stop'
      });
      ventilator.stop(done);
    });
  });

  describe('#getPatient', function () {
    it("should return a overseer when it's ready", function (done) {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      ventilator.init(task, {
        name: 'test-dispatcher-getPatient'
      });
      const overseer1 = Object.create(Overseer);
      overseer1.init('dumbWorker', error => {
        expect(error).to.be.null;
      });
      const overseer2 = Object.create(Overseer);
      overseer2.init('dumbWorker', error => {
        expect(error).to.be.null;
      });

      ventilator.addToWaitingQueue(overseer1);
      ventilator.getPatient().then(overseer => {
        expect(overseer).to.be.an('object');
        expect(overseer).to.have.property('send');
      });
      ventilator.getPatient().then(overseer => {
        expect(overseer).to.be.an('object');
        expect(overseer).to.have.property('send');
        done();
      });
      setTimeout(() => {
        ventilator.addToWaitingQueue(overseer2);
      }, 200);
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
      for (var i = 0; i < 4; i++) {
        const overseer = Object.create(Overseer);
        overseer.init('dumbWorker', error => {
          expect(error).to.be.null;
        });
        ventilator.addToWaitingQueue(overseer);
      }

      ventilator.on('result', data => {
        expect(data).to.be.an('object');
        expect(data.type).to.equal('job');
      });

      return ventilator.start();
    });
  });
});

'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Dispatcher = require('../src/dispatcher');
const Task = require('../src/task');

describe(`${pkg.name}/src/Dispatcher.js`, function () {
  describe("#init", function () {
    it("should be initialized successfully", function () {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      ventilator.init(task, {
        name: "test"
      })
      expect(ventilator.tasks).to.be.an("object");
      expect(ventilator.options).to.be.an("object");
      expect(ventilator.waitingQueue).to.be.an("array");
    });
  })

  describe("#getWorker", function () {
    it("should return a worker when it's ready", function (done) {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      ventilator.init(task, {
        name: "test"
      });
      ventilator.addWorker("worker1");
      ventilator.getWorker((worker) => {
        expect(worker).to.be.a("string");
        expect(worker).to.be.equal("worker1")
      });
      ventilator.getWorker((worker) => {
        expect(worker).to.be.a("string");
        expect(worker).to.be.equal("worker2")
        done();
      });
      setTimeout(() => {
        ventilator.addWorker("worker2");
      }, 200)
    });
  })
});
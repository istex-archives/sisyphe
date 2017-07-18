'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const dispatcher = require('../src/dispatcher');
const kue = require('kue');

describe(`${pkg.name}/src/dispatcher.js`, function () {
  describe("#init", function () {
    it("should be initialized successfully", function () {
      const ventilator = Object.create(dispatcher);
      const queue = kue.createQueue();
      ventilator.init(queue, {
        name: "test"
      })
      expect(ventilator.tasks).to.be.an("object");
      expect(ventilator.options).to.be.an("object");
      expect(ventilator.waitingQueue).to.be.an("array");
    });
  })

  describe("#getWorker", function () {
    it("should return a worker when it's ready", function (done) {
      const ventilator = Object.create(dispatcher);
      const queue = kue.createQueue();
      ventilator.init(queue, {
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
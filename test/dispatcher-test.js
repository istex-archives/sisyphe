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

  describe("#getOverseer", function () {
    it("should return a overseer when it's ready", function (done) {
      const ventilator = Object.create(Dispatcher);
      const task = Object.create(Task);
      ventilator.init(task, {
        name: "test"
      });
      ventilator.addOverseer("overseer1");
      ventilator.getOverseer((overseer) => {
        expect(overseer).to.be.a("string");
        expect(overseer).to.be.equal("overseer1")
      });
      ventilator.getOverseer((overseer) => {
        expect(overseer).to.be.a("string");
        expect(overseer).to.be.equal("overseer2")
        done();
      });
      setTimeout(() => {
        ventilator.addOverseer("overseer2");
      }, 200)
    });
  })
});
'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Dispatcher = require('../src/dispatcher');
const Overseer = require('../src/overseer');
const Task = require('../src/task');

describe(`${pkg.name}/src/dispatcher.js`, function () {
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

  describe("#start", function () {
    it("should start and dispatch tasks", function (done) {
      const doc = Object.create(Task);
      doc.init({
        name: "test"
      });
      for (let i = 0; i < 8; i++) {
        doc.add({
          id: i,
          type: "pdf"
        });
      }

      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer.init(`${__dirname}/dumbWorker.js`);

      const johnTheOverseer = Object.create(Overseer);
      johnTheOverseer.init(`${__dirname}/dumbWorker.js`);

      const ventilator = Object.create(Dispatcher);
      ventilator.init(doc, {
        name: "test"
      });
      ventilator.addOverseer(bobTheOverseer);
      ventilator.addOverseer(johnTheOverseer);
      ventilator.start(() => {
        done();
      });
    });
  })
});
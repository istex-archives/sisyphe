'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
// const kue = require('kue');
const Queue = require('bull');
const Task = require('../src/task');

describe(`${pkg.name}/src/task.js`, function () {
  describe("#init", function () {
    it("should be initialized successfully", function () {
      const docs = Object.create(Task);
      docs.init({
        name: "test-task-init"
      });
      expect(docs.name).to.be.an("string");
      expect(docs.queue).to.be.an("object");
      expect(docs.queue).to.be.an.instanceof(Queue);
    });
  })

  describe("#add", function () {
    it("should add some task", function () {
      const docs = Object.create(Task);
      docs.init({
        name: "test-task-add"
      });
      return docs.add({
        id: 161,
        type: "pdf"
      });
    });
  })

  describe("#process", function () {
    it("should process the tasks", function (done) {
      const docs = Object.create(Task);
      docs.init({
        name: "test-task-process"
      });
      docs.add({
        id: 172,
        type: "pdf"
      });
      docs.process((doc, next) => {
        next();
        done();
      })
    })
  })

  describe("#on", function () {
    it("should listen to some events", function (done) {
      const docs = Object.create(Task);
      docs.init({
        name: "test-task-on"
      });
      docs.add({
        id: 212,
        type: "pdf"
      });
      docs.process((doc, next) => {
        doc.data.id++;
        next(null, doc.data);
      })
      docs.on('completed', (job, result) => {
        expect(result.id).to.equal(213);
        done();
      })
    })
  })
});
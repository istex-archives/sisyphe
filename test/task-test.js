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
      docs.process((doc, end) => {
        end();
        done();
      })
    })
  })

  describe("#getJobCounts", function () {
    it("should get job counts", function () {
      const docs = Object.create(Task);
      docs.init({
        name: "test-task-getJobCounts"
      });
      docs.add({
        id: 212,
        type: "pdf"
      });
      return docs.getJobCounts().then((jobCounts) => {
        expect(jobCounts).to.be.an('object');
        expect(jobCounts.waiting).to.equal(0);
        expect(jobCounts.active).to.equal(0);
        expect(jobCounts.completed).to.equal(0);
        expect(jobCounts.failed).to.equal(0);
        expect(jobCounts.delayed).to.equal(0);
      })
    })
  })
});
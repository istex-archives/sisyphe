'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Queue = require('bull');
const Task = require('../src/task');

describe(`${pkg.name}/src/task.js`, function () {
  describe('#init', function () {
    it('should be initialized successfully', function () {
      const docs = Object.create(Task);
      const returnDocs = docs.init({
        name: 'test-task-init'
      });
      expect(returnDocs).to.be.equal(docs);
      expect(docs.name).to.be.an('string');
      expect(docs.queue).to.be.an('object');
      expect(docs.queue).to.be.an.instanceof(Queue);
    });

    it('should be initialized successfully whith a string redis connection', function () {
      const docs = Object.create(Task);
      const returnDocs = docs.init({
        name: 'test-task-init2',
        stringRedisConnection: 'redis://127.0.0.1:6739'
      });
      expect(returnDocs).to.be.equal(docs);
      expect(docs.name).to.be.an('string');
      expect(docs.queue).to.be.an('object');
      expect(docs.queue).to.be.an.instanceof(Queue);
    });
  });

  describe('#add', function () {
    it('should add some task', function () {
      const docs = Object.create(Task);
      return docs.init({
        name: 'test-task-add'
      }).add({
        id: 161,
        type: 'pdf'
      });
    });
  });

  describe('#process', function () {
    it('should process the tasks', function () {
      const docs = Object.create(Task);
      const job = {
        id: 172,
        type: 'pdf'
      };
      return docs.init({
        name: 'test-task-process'
      }).add(job).then(() => {
        docs.process((doc, next) => {
          expect(doc).to.have.property('data');
          expect(doc.data).to.deep.equal(job);
          next();
        });
      });
    });
  });

  describe('#getJobCounts', function () {
    it('should get count jobs', function () {
      const docs = Object.create(Task);
      return docs.init({
        name: 'test-task-get-job-counts'
      }).add({
        id: 172,
        type: 'pdf'
      }).then(() => {
        return docs.getJobCounts();
      }).then((counts) => {
        expect(counts).to.be.an('object');
        expect(counts).to.have.property('waiting');
        expect(counts).to.have.property('active');
        expect(counts).to.have.property('completed');
        expect(counts).to.have.property('failed');
        expect(counts).to.have.property('delayed');
      });
    });
  });

  describe('#on', function () {
    it('should listen to some events', function (done) {
      const docs = Object.create(Task);
      docs.init({
        name: 'test-task-on'
      }).add({
        id: 212,
        type: 'pdf'
      }).then(() => {
        docs.process((doc, next) => {
          doc.data.id++;
          next(null, doc.data);
        });
      });

      docs.on('completed', (job, result) => {
        expect(result.id).to.equal(213);
        done();
      });
    });
  });
});

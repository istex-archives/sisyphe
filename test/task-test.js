'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const kue = require('kue')
const Task = require('../src/task');

describe(`${pkg.name}/src/task.js`, function () {
  describe("#init", function () {
    it("should be initialized successfully", function () {
      const doc = Object.create(Task);
      doc.init({name: "test"});
      expect(doc.name).to.be.an("string");
      expect(doc.queue).to.be.an("object");
      expect(doc.queue).to.be.an.instanceof(kue);
    });
  })
  
  describe("#add", function () {
    it("should add some task", function (done) {
      const doc = Object.create(Task);
      doc.init({name: "test"});
      doc.add({id:123, type:"pdf"}, (error) => {
        expect(error).to.be.undefined;
        done();
      });
    });
  }) 
});
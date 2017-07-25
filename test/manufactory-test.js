'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Manufactory = require('../src/manufactory');

describe(`${pkg.name}/src/manufactory.js`, function () {
  describe('#init', function () {
    it('should be initialized successfully', function () {
      const enterprise = Object.create(Manufactory);
      enterprise.init();
      expect(enterprise.workers).to.be.an('array');
      expect(enterprise.workers).to.be.empty;
      expect(enterprise.pathToAnalyze).to.be.a('string');
      expect(enterprise.numCPUs).to.be.a('number');
    });
  });

  describe('#createDispatchers', function () {
    it('should create dispatchers for each workers', function () {
      const enterprise = Object.create(Manufactory);
      enterprise.init().addWorker('dumbWorker').createDispatchers();
      expect(enterprise.dispatchers).to.be.an('array');
      expect(enterprise.dispatchers).to.have.lengthOf(1);
    });
  });

  describe('#createOverseersForDispatchers', function () {
    this.timeout(5000);
    it('should create overseers for each dispatchers', function () {
      const enterprise = Object.create(Manufactory);
      return enterprise
        .init()
        .addWorker('dumbWorker')
        .addWorker('dumbWorker')
        .createDispatchers()
        .createOverseersForDispatchers().then((result) => {
          console.log(result);
        }).catch((error) => {
          console.log(error);
        });
    });
  });
});

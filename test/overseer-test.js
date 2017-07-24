'use strict';

const pkg = require('../package.json');
const chai = require('chai');
const expect = chai.expect;
const Overseer = require('../src/overseer');

describe(`${pkg.name}/src/overseer.js`, function() {
  describe('#init', function() {
    it('should be initialized successfully', function(done) {
      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer.init('dumbWorker', error => {
        expect(error).to.be.null;
      });
      bobTheOverseer.on('message', msg => {
        if (msg.hasOwnProperty('type') && msg.type === 'initialize') {
          expect(msg.type).to.equal('initialize');
          expect(msg.worker).to.equal('dumbWorker');
          expect(msg.isInitialized).to.be.true;
          done();
        }
      });
    });
  });

  describe('#send', function() {
    this.timeout(5000);
    it('should send some data', function(done) {
      const data = {
        id: 159,
        type: 'pdf'
      };
      const bobTheOverseer = Object.create(Overseer);
      bobTheOverseer.init('dumbWorker', error => {
        expect(error).to.be.null;
      });

      bobTheOverseer.send(data, error => {
        expect(error).to.be.null;
      });

      bobTheOverseer.on('message', msg => {
        if (msg.hasOwnProperty('type') && msg.type === 'job') {
          expect(msg.type).to.equal('job');
          expect(msg.data).to.deep.equal(data);
          done();
        }
      });
    });
  });
});

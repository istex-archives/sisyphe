'use strict';

const chai = require('chai'),
  expect = chai.expect,
  sisypheOut = require('../index.js');

describe('init', () => {
  it('should initialize the module', () => {
    sisypheOut.init({corpus: 'test'});
    expect(sisypheOut.init).to.be.a('function');
    expect(sisypheOut.doTheJob).to.be.a('function');
    expect(sisypheOut.client).to.be.an('object');
    expect(sisypheOut.redisClient).to.be.an('object');
    expect(sisypheOut.logger).to.be.an('object');
  });
});

// TODO : Finish this test with sinon.js

// describe('doTheJob', () => {
//   it('should do the job for a doc object', () => {
//     sisypheOut.init({corpus: 'test'})
//       .doTheJob({path: 'path/to/file'}, (doc, next) => {
//         console.log(doc)
//       });
//   });
// });
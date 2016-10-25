'use strict';

class Business {
  doTheJob(data, next) {
    setTimeout(() => {
      // console.log('beta-worker : ', data);
      next();
    }, 10);
  }

  finalJob(done) {
    setTimeout(() => {
      done()
    }, 20)
  }
}

module.exports = new Business();
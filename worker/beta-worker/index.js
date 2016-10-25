'use strict';

class Business {
  doTheJob(data, next) {
    setTimeout(() => {
      // console.log('beta-worker : ', data);
      if (data.extension === '.xml') {
        next(new Error("I don't want yours metadata, dude !"));
      } else {
        next()
      }
    }, 20);
  }

  finalJob(done) {
    setTimeout(() => {
      done()
    }, 20)
  }
}

module.exports = new Business();
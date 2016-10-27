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
    }, 50);
    // Math.floor(Math.random() * 80 + 20)
  }

  finalJob(done) {
    setTimeout(() => {
      console.log('this is the final countdown');
      done()
    }, Math.floor(Math.random() * 80 + 20))
  }
}

module.exports = new Business();
'use strict';

class Business {
  doTheJob(data, next) {
    setTimeout(() => {
      // console.log('alpha-worker : ', data);
      // if (data.size < 500 ) {
      //   next(new Error("I don't want yours smallfile, dude !"));
      // } else {
      //   next()
      // }
      next();
    }, 80);
    // Math.floor(Math.random() * 80 + 20)
  }
}

module.exports = new Business();
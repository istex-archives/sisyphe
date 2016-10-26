'use strict';

class Business {
  doTheJob(data, next) {
    setTimeout(() => {
      console.log('alpha-worker : ', data);
      if (data.size > 5000 ) {
        next(new Error("I don't want yours bigfile, dude !"));
      } else {
        next()
      }
      next();
    }, Math.floor(Math.random() * 80 + 20));
  }
}

module.exports = new Business();
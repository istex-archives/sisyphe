'use strict';

class Business {
  doTheJob(data, next) {
    setTimeout(() => {
      // console.log('alpha-worker : ', data);
      next();
    }, 30);
  }
}

module.exports = new Business();
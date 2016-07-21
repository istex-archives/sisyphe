'use strict';

class Business {
  doTheJob(data, next) {
    setTimeout(() => {
      data.count++;
      console.log('alpha-worker : ', data);
      next();
    }, 10);
  }
}

module.exports = new Business();
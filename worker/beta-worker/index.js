'use strict';

class Business {
  doTheJob(data, next) {
    setTimeout(() => {
      data.count++;
      // console.log('beta-worker : ', data);
      next();
    }, 10);
  }
}

module.exports = new Business();
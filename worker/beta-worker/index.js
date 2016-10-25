'use strict';

class Business {
  doTheJob(data, next) {
    setTimeout(() => {
      // console.log('beta-worker : ', data);
      next();
    }, 10);
  }

  finalJob(callback) {
    setTimeout(() => {
      callback(null, 'finalJob from beta-worker executed !')
    }, 20)
  }
}

module.exports = new Business();
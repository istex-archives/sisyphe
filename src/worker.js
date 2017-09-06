const path = require('path');

let performer;
let isInitialized = false;
process.on('message', msg => {
  if (!isInitialized && msg.hasOwnProperty('type') && msg.type === 'initialize') {
    try {
      // throw new Error('My Error')
      const Performer = require(path.join(__dirname, 'worker', msg.worker));
      performer = Object.create(Performer);
      if ('init' in performer) performer.init(msg.options);
      isInitialized = true;
      msg.isInitialized = true;
      process.send(msg);
    } catch (error) {
      process.send({
        type: 'error',
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    }
  }

  if (isInitialized && msg.hasOwnProperty('type') && msg.type === 'job') {
    performer.doTheJob(msg.data, (error, data) => {
      error ? process.send({
        type: 'error',
        message: error.message,
        code: error.code,
        stack: error.stack
      }) : process.send(msg);
    });
  }

  if (isInitialized && msg.hasOwnProperty('type') && msg.type === 'final') {
    if ('finalJob' in performer) {
      performer.finalJob(error => {
        if (error) {
          process.send({
            type: 'error',
            message: error.message,
            code: error.code,
            stack: error.stack
          });
        } else {
          process.send(msg);
        }
      });
    } else {
      process.send(msg);
    }
  }
});

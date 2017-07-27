const path = require('path');

let performer;
let isInitialized = false;

process.on('message', msg => {
  if (!isInitialized && msg.hasOwnProperty('type') && msg.type === 'initialize') {
    try {
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
        code: error.code
      });
    }
  }

  if (isInitialized && msg.hasOwnProperty('type') && msg.type === 'job') {
    performer.doTheJob(msg.data, (error, data) => {
      (error) ? process.send(error) : process.send(msg);
    });
  }

  if (isInitialized && msg.hasOwnProperty('type') && msg.type === 'stop') {
    performer.finalJob(msg.options, (error) => {
      if (error) return process.send(error);
      process.kill(process.pid);
    });
  }
});

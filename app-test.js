const Dispatcher = require('./src/dispatcher');
const Overseer = require('./src/overseer');
const Task = require('./src/task');
const Promise = require('bluebird');

const inputDirectory = '/home/meja/Data/dataset-xsmall/bmj/acupmed/acupmed-11/acupmed-11-1';
const numForks = 8;
const workers = ['walker-fs', 'filetype', 'xpath'];
// const workers = ['walker-fs', 'dumbWorker'];

Promise.map(workers, (worker, index, array) => {
  console.log('Worker : ', worker);
  const task = Object.create(Task);
  task.init({name: worker});
  const dispatcher = Object.create(Dispatcher);
  dispatcher.init(task, {
    name: worker
  });
  return dispatcher;
}).map(dispatcher, (worker, index, array) => {
  console.log(dispatcher.options.name, workers[index], array.length !== index + 1)
  if (array.length !== index + 1) {
    dispatcher.on('result', function (msg) {
      console.log('result', workers[index], msg);
      if(msg.data.hasOwnProperty('directory') && msg.data.hasOwnProperty('files')) {
        msg.data.directories.map(directory => dispatcher.tasks.add({ directory }));
        // msg.data.files.map(file => console.log(file));
        msg.data.files.map(file => dispatchers[index + 1].tasks.add(file));
      }
    });
  } else {
    dispatcher.on('result', function (msg) {
      console.log('result', workers[index], msg);
    });
  }
  
  dispatcher.tasks.on('failed', (job, err) => {
    console.log(err);
  });
  return dispatcher;
}).map(dispatcher, (worker, index, array) => {
  return Promise.map(Array.from(Array(numForks).keys()), (numero) => {
    const overseer = Object.create(Overseer);
    return overseer.init(worker).then(() => {
      dispatcher.addToWaitingQueue(overseer);
    })    
  }
}).then(() => {
  console.log('start');
  return dispatchers[1].tasks.add({ 
    corpusname: 'default',
    startAt: 1500996739358,
    extension: '.xml',
    path: '/home/meja/Data/dataset-xsmall/bmj/acupmed/acupmed-11/acupmed-11-1/acupmed-11-48.xml',
    name: 'acupmed-11-48.xml',
    size: 2390 
  })
}).then(() => {
  return dispatchers[1].start();
}).then(() => {
  console.log('succeed !')
}).catch((error) => {
  console.log(error);
});

// dispatchers[0].tasks.add({directory: inputDirectory}).then(() => {
//   return Promise.each(dispatchers, (dispatcher) => {
//     return dispatcher.start();
//   })
// }).then(() => {
//   console.log('succeed !')
// }).catch((error) => {
//   console.log(error);
// });

/************************************/
/*
const doc = Object.create(Task);
doc.init({
  name: 'test-app'
}).add({
  directory: inputDirectory
});

const ventilator = Object.create(Dispatcher);
ventilator.init(doc, {
  name: 'test-app'
});
for (var i = 0; i < numForks; i++) {
  const overseer = Object.create(Overseer);
  overseer.init('walker-fs').catch(error => {
    if (error) console.log(error);
  });
  ventilator.addToWaitingQueue(overseer);
}

ventilator.on('result', function (msg) {
  msg.data.directories.map(directory => ventilator.tasks.add({ directory }));
  process.stdout.write(msg.data.files.length + '.');
});

ventilator.tasks.on('failed', (job, err) => {
  console.log(err);
});

console.time('bench');
console.log('start');
ventilator.start().then(() => {
  // console.log('done');
  console.timeEnd('bench');
  process.exit(0);
});

*/
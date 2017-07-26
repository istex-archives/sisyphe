const Manufactory = require('./src/manufactory');

const inputPath = '/home/meja/Data/dataset-xsmall/bmj/acupmed/acupmed-11/acupmed-11-1';
const workers = ['walker-fs', 'filetype'];
// const workers = ['walker-fs', 'dumbWorker'];

const enterprise = Object.create(Manufactory);

enterprise.init({ inputPath });
workers.map(worker => {
  enterprise.addWorker(worker);
});
enterprise.initializeWorkers().then(() => {
  enterprise.dispatchers[1].on('result', (msg) => {
    console.log(msg);
  });
  return enterprise.start();
}).then(() => {
  console.log('stop !');
});

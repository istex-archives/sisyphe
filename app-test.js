const Dispatcher = require('./src/dispatcher');
const Overseer = require('./src/overseer');
const Task = require('./src/task');

const doc = Object.create(Task);
doc.init({
  name: 'test-app'
});
doc.add({
  directory: '/home/meja/Data/dataset-xsmall'
});

const ventilator = Object.create(Dispatcher);
ventilator.init(doc, {
  name: 'test-app'
});
for (var i = 0; i < 8; i++) {
  const overseer = Object.create(Overseer);
  overseer.init('walker-fs', error => {
    if (error) console.log(error);
  });
  ventilator.addOverseer(overseer);
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
ventilator.start(() => {
  // console.log('done');
  console.timeEnd('bench');
  process.exit(0);
});

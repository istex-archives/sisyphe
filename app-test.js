const Dispatcher = require('./src/dispatcher');
const Overseer = require('./src/overseer');
const Task = require('./src/task');

const doc = Object.create(Task);
doc.init({
  name: "test-app"
});
doc.add({
  directory: '/home/meja/Data/dataset-xsmall'
});

const ventilator = Object.create(Dispatcher);
ventilator.init(doc, {
  name: "test-app"
});
for (var i = 0; i < 8; i++) {
  const overseer = Object.create(Overseer);
  overseer.init(`${__dirname}/test/walker-test.js`);
  // TODO : ajouter un event "results" sur le dispatcher
  overseer.on('message', function(msg) {
    msg.directories.map((directory) => {
      ventilator.tasks.add({directory})
    })
  })
  ventilator.addOverseer(overseer);
}

ventilator.tasks.on('failed', (job, err) => {
  console.log(err);
})

console.time('bench');
console.log('start');
ventilator.start(() => {
  // console.log('done');
  console.timeEnd('bench');
  process.exit(0);
});
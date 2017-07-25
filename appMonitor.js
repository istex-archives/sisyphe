const monitor = require('./monitor')
const Queue = require('bull');

const Task = require('./src/task');

async function launchMonitor() {
  const queue = new Queue("filetype");
  const queue2 = new Queue("xml");
  const queue3 = new Queue("walker");
  for (var i = 0; i < 64; i++) {
    await queue.add({
      id: ~~(Math.random() * 100)
    });
    await queue2.add({
      id: ~~(Math.random() * 100)
    });
    await queue3.add({
      id: ~~(Math.random() * 100)
    });
  }



  try {

    monitor.init({
      refresh: 1000,
      walker: {
        server: '',
        key: 'walker'
      },
      workers: [{
        keys: ['walker', 'filetype', 'xml', 'a','v']
      }]
    })
    monitor.launch()

  } catch (e) {
console.log(e);
  } finally {

  }


}
launchMonitor()

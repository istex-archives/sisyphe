const monitor = require('./src/monitor')
const Queue = require('bull');

async function launchMonitor() {
  const prefix = 'sisyphe'
  const filetype = new Queue("filetype", {
    prefix
  });
  const xml = new Queue("xml", {
    prefix
  });
  const walker = new Queue("walker-fs", {
    prefix
  });


  const nbDocs = 800
  for (var i = 0; i < nbDocs; i++) {
    await walker.add({
      id: ~~(Math.random() * 100)
    });
  }

  for (var i = 0; i < nbDocs; i++) {
    await filetype.add({
      id: ~~(Math.random() * 100)
    });
  }
  for (var i = 0; i < nbDocs; i++) {
    await xml.add({
      id: ~~(Math.random() * 100)
    });
  }
  return process(xml).then(_ => {
      log('xml')
      return process(filetype)
    }).then(_=>{
      log('filetype')
    })
}


function log(data) {
  console.log(data)
}

function process(queue) {
  return new Promise(function(resolve, reject) {
    log(queue.name)
    queue.process((docs, next) => {
      const xmlTimeout = setTimeout(async function() {
        const job = await queue.getJobCounts()
        log(job.waiting)
        if (!job.waiting) {
          log('lkfrrrrfrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr')
          clearTimeout(xmlTimeout)
          resolve()
        }
        next()
      }, 10);
    });
  });
}
launchMonitor()

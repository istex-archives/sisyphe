const monitor = require('./src/monitor')
const Queue = require('bull');

async function launchMonitor() {
  const prefix = 'sisyphe'
  const filetype = new Queue("filetype", {prefix});
  const xml = new Queue("xml", {prefix});
  const walker = new Queue("walker", {prefix});


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

  xml.process((docs, next) => {
    const xmlTimeout = setTimeout(async function() {
      const job = await xml.getJobCounts()
      if (!job.waiting) {
        clearTimeout(xmlTimeout)
        filetype.process(async (docs, next) => {
          setTimeout(function() {
            next()
          }, 10);
        });
      }
      next()
    }, 10);
  });

}
launchMonitor()

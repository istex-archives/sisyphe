process.on('message', (msg) => {
  // i'm so dumb
  const time = ~~(Math.random() * 100);
  // if (msg.type === 'pdf') console.log(process.pid, msg, time);
  setTimeout(() => {
    msg.isDone = true;
    process.send(msg);
  }, time);
});

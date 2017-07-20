process.on('message', (msg) => {
  // i'm so dumb
  // if (msg.type === 'pdf') console.log(process.pid, msg, time);
  const time = ~~(Math.random() * 100);
  setTimeout(() => {
    msg.isDone = true;
    process.send(msg);
  }, time);
});

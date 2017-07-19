process.on('message', (msg) => {
  // i'm so dumb 
  msg.isDone = true;
  process.send(msg);
});
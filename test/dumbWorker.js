process.on('message', (msg) => {
  // i'm so dumb 
  // if (msg.type === "pdf") console.log(process.pid, msg);
  msg.isDone = true;
  process.send(msg);
});
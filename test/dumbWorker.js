process.on('message', (msg) => {
  // i'm so dumb 
  msg.isValid = true;
  process.send(msg);
});
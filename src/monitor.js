/**
 * Created by dieudonn on 16/06/2017.
 */
'use strict';

const v8 = require('v8');
const cpuStat = require('cpu-stat')
const os = require('os')
v8.setFlagsFromString('--max_old_space_size=4096');

const blessed = require('blessed'),
  contrib = require('blessed-contrib'),
  colors = require('colors/safe'),
  ms = require('pretty-ms');

let processingMonitor = new Monitor();
let refreshRate = 10000

function Monitor () {
  let self = this;

  // message received from Dad App.js
  process.on('message', function (options) {
    self.workers = options.workers ? options.workers : self.workers;
    self.startAt = options.startAt ? options.startAt : self.startAt;
    self.workersListNames = options.workersListNames ? options.workersListNames : self.workersListNames;
    self.totalFailedTask = options.totalFailedTask ? options.totalFailedTask : self.totalFailedTask;
    self.totalFoundFiles = options.totalFoundFiles ? options.totalFoundFiles : self.totalFoundFiles;
    self.totalPerformedFiles = options.totalPerformedFiles ? options.totalPerformedFiles : self.totalPerformedFiles;
    self.currentFoundFiles = options.currentFoundFiles ? options.currentFoundFiles : self.currentFoundFiles;


    let logsColors = {error: 'red', walker: 'yellow', default: 'green'};
    if(options){
      if(options.hasOwnProperty('refresh')){
        let refresh = options.refresh ? options.refresh : 3000
        self.interval = setInterval(processingMonitor.update, refresh);
      }
      if(options.hasOwnProperty('log')){
        options.type = options.type || 'default';
        self.log.log(colors[logsColors[options.type]](options.log));
      }
      if(options.hasOwnProperty('stop') && options.stop){
        // SetTimeOut to be sure to show the lastest value
        self.log.log(colors.cyan('Stopping Sisyphe monitor'));
        setTimeout(function () {
          //stop monitor
          clearInterval(self.interval);
        },this.refreshRate + 1000);
      }
    }
  });

  //List of workers
  this.workers = [];
  this.workersListNames = [];

  // Set all data
  this.totalFoundFiles = this.totalPerformedFiles = this.currentFoundFiles = this.totalFailedTask = this.startAt = 0;

  this.screen = blessed.screen({
    smartCSR: true
  });

  this.question = blessed.question({
    parent: this.screen,
    border: 'line',
    height: 'shrink',
    width: 'half',
    top: 'center',
    left: 'center',
    label: ' {red-fg}Question{/red-fg} ',
    tags: true,
    keys: true,
    vi: true,
    style: {
      border: {
        fg: 'red'
      }
    }
  });
  // exit the program by using esc q or ctl-c
  this.screen.key(['C-c'], (ch, key) => {
    this.question.setIndex(999999);
    this.question.ask('Do you want to quit Sisyphe ?', function (err,res) {
      if(res === true){
        process.exit(0);
      }
    });
  });
  this.grid = new contrib.grid({rows: 12, cols: 12, screen: this.screen});
  this.duration = this.grid.set(8, 4, 4, 4, blessed.box,
    {
      fg: 'green',
      interactive: false,
      align: 'center',
      valign: 'middle',
      label: 'Duration',
      noCellBorders: false,
  });
  this.tableProgress = this.grid.set(8, 0, 4, 4, contrib.table,
  {
    fg: 'green',
    interactive: false,
    label: 'Walking & processing progress',
    columnSpacing: 1,
    columnWidth: [24, 10],
    noCellBorders: false,
    border: 'dashed',
    fillCellBorders: true
  });
  this.tableModules = this.grid.set(4, 4, 4, 4, contrib.table,
    {
      fg: 'green',
      interactive: false,
      label: 'Modules progression',
      columnSpacing: 1,
      columnWidth: [24,10],
      noCellBorders: false,
      border: 'dashed',
      fillCellBorders: true
    });
  this.donut = this.grid.set(0, 0, 8, 4, contrib.donut,
  {
    label: 'Global progression',
    radius: 16,
    arcWidth: 4,
    yPadding: 2,
    data: [{label: 'Progress %', percent: 0}]
  });
  this.log = this.grid.set(0, 4, 4, 4, blessed.log, {
    fg: "green",
    selectedFg: "green",
    label: 'Sisyphe Log',
    keys:true,
    scrollbar: {
       ch: ' ',
       inverse: true
    }
  });
  this.htop = this.grid.set(0, 8, 2, 4, contrib.bar,{
    label: 'Usage',
    barWidth: 4,
    barSpacing: 6,
    xOffset: 0,
    maxHeight: 9})

  this.screen.append(this.tableProgress);
  this.screen.append(this.tableModules);
  this.screen.append(this.log);
  this.screen.append(this.donut);
  this.screen.append(this.htop);
  this.screen.render();
  self.log.focus()
  this.screen.on('resize', _=> {
    this.donut.emit('attach');
    this.log.emit('attach');
    this.tableProgress.emit('attach');
  });
  this.update = function () {
    let progress = self.totalFoundFiles ? (self.totalPerformedFiles / self.totalFoundFiles) : 0;
    let color = "red";
    if (progress >= 0.25) color = "yellow";
    if (progress >= 0.5) color = "cyan";
    if (progress >= 0.75) color = "green";
    self.donut.setData([
      {percent: progress.toFixed(2), label: 'Total progression', 'color': color}
    ]);
    cpuStat.usagePercent((err, percent, seconds) => {
      self.htop.setData({
          titles:['CPUs', "RAM"],
          data:[~~percent, 100 - ~~((os.freemem() * 100) / os.totalmem())]
        })})
    // Set info for all modules
    let data = [];
    for(let j = 0; j < self.workers.length; j++){
      data[j] = [colors[self.workers[j].color](self.workersListNames[j]),colors[self.workers[j].color](self.workers[j].processedFiles.toString())];
    }
    self.tableModules.setData({headers: ['Type', 'Count'], data: data});
    // Global progression
    self.tableProgress.setData({headers: ['Type', 'Count'], data: [
      [colors.green('totalPerformedFiles'), colors.green(self.totalPerformedFiles)],
      [colors.yellow('currentFoundFiles'), colors.yellow(self.currentFoundFiles)],
      [colors.yellow('totalFoundFiles'), colors.yellow(self.totalFoundFiles)],
      [colors.red('totalFailedTask'), colors.red(self.totalFailedTask)]
    ]});
    let currentime = new Date().getTime();
    let duration = ms(currentime - self.startAt);
    self.duration.setContent(duration);
    self.screen.render();
  };

  this.setRefresh = function (refreshRate_p) {
    refreshRate = refreshRate_p
  }
}

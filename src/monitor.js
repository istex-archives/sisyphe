/**
 * Created by dieudonn on 16/06/2017.
 */
'use strict';

const v8 = require('v8');
v8.setFlagsFromString('--max_old_space_size=4096');

const blessed = require('blessed'),
  contrib = require('blessed-contrib'),
  colors = require('colors/safe'),
  ms = require('pretty-ms');

let processingMonitor = new Monitor();
processingMonitor.interval = setInterval(processingMonitor.update,50);

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
    if(options){
      if(options.hasOwnProperty('log')){
        self.log.log(options.log);
      }
      if(options.hasOwnProperty('stop') && options.stop){
        // SetTimeOut to be sure to show the lastest value
        setTimeout(function () {
          //stop monitor
          clearInterval(self.interval);
        },2100);
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
  // exit the program by using esc q or ctl-c
  this.screen.key(['C-c'], (ch, key) => {
    process.exit(0);
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
  this.log = this.grid.set(0, 4, 4, 4, contrib.log, {
    fg: "green",
    selectedFg: "green",
    label: 'Sisyphe Log'
  });

  this.screen.append(this.tableProgress);
  this.screen.append(this.tableModules);
  this.screen.append(this.log);
  this.screen.append(this.donut);
  this.screen.render();
  this.tableProgress.focus();
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
}

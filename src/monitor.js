/**
 * Created by dieudonn on 16/06/2017.
 */
'use strict';

const blessed = require('blessed'),
  contrib = require('blessed-contrib'),
  ms = require('pretty-ms');

module.exports = function () {

  this.screen = blessed.screen({
    smartCSR: true
  });
  // exit the program by using esc q or ctl-c
  this.screen.key(['escape', 'q', 'C-c'], (ch, key) => {
    return process.exit(0);
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
  // this.screen.append(this.textProgress);
  // this.screen.append(this.bar);
  // this.screen.append(this.list);
  // this.screen.title = 'Sisyphe progression dashboard';
  this.tableProgress.focus();
  this.screen.on('resize', _=> {
    this.donut.emit('attach');
    this.log.emit('attach');
    this.tableProgress.emit('attach');
  });
};
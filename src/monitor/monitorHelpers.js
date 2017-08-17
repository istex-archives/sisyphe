const colors = require('colors/safe')
/**
 * List of help function
 * @constructor
 */
function MonitorHelpers() {}

/**
 * Convert an object to an array with array of properties inside
 * @param  {Object} object Object with properties
 * @return {Array}        Array of properties
 */
MonitorHelpers.prototype.propertyToArray = function(object) {
  const arrayWaitingModules = []
  for (var value in object) {
    if (object.hasOwnProperty(value)) {
      arrayWaitingModules.push([value])
    }
  }
  return arrayWaitingModules
}


/**
 * Format array of log with colors
 * @param  {Array} log array containing type containing log
 * @return {Array}        Array logs with colors
 */
MonitorHelpers.prototype.getColorLog = function(logs) {
  const formatedLogs = []
  for (var i = 0; i < Object.keys(logs).length; i++) {
    const type = Object.keys(logs)[i]
    formatedLogs.push(getColor(type, '┌─────────────────────'))
    formatedLogs.push(getColor(type, '├─ ' + type + ':'))
    for (var j = 0; j < logs[type].length; j++) {
      formatedLogs.push(getColor(type, '├─── ' + logs[type][j]))
    }
    formatedLogs.push(getColor(type, '└─────────────────────'))
  }

  function getColor(type, string) {
    switch (type) {
      case 'warning':
        return colors.yellow(string)
        break;
      case 'error':
        return colors.red(string)
        break;
      case 'info':
        return colors.blue(string)
        break;
      default:
        return string
    }
  }
  return formatedLogs
}

/**
 * Returns a color corresponding to the percentage
 * @param  {Number} percent A percentage
 * @return {String}         A color
 */
MonitorHelpers.prototype.getColorOfPercent = function(percent) {
  switch (true) {
    case percent >= 0 && percent <= 20:
      return color = 'red'
    case percent > 20 && percent <= 40:
      return color = 'yellow'
    case percent > 40 && percent <= 60:
      return color = 'magenta'
    case percent > 60 && percent <= 80:
      return color = 'cyan'
    case percent > 80 && percent <= 100:
      return color = 'green'
    default:
      return color = 'red'
  }
}

/**
 * Count properties in object
 * @param  {Object} object An object
 * @return {Number}        Number of properties
 */
MonitorHelpers.prototype.nbProperty = function(object) {
  let nbProperty = 0
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      nbProperty++
    }
  }
  return nbProperty
}

/**
 * Get time between two date in milliseconds
 * @param  {Number} startDateInMs First date in milliseconds
 * @param  {Number} endDateInMs   Second date in milliseconds
 * @return {Date}                 A date containing hours, minutes and seconds between the first date and the second date
 */
MonitorHelpers.prototype.getTimeBetween = function(startDateInMs, endDateInMs) {
  const time = new Date()
  time.setSeconds(endDateInMs / 1000 - startDateInMs / 1000);
  time.setMinutes(endDateInMs / (1000 * 60) - startDateInMs / (1000 * 60));
  time.setHours(endDateInMs / (1000 * 60 * 60) - startDateInMs / (1000 * 60 * 60));
  return time
}

module.exports = new MonitorHelpers()

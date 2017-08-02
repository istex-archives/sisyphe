module.exports.propertyToArray = function(object) {
  const arrayWaitingModules = []
  for (var value in object) {
    if (object.hasOwnProperty(value)) {
      arrayWaitingModules.push([value])
    }
  }
  return arrayWaitingModules
}

module.exports.getColorOfPercent = function(percent) {
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
module.exports.nbProperty = function(object) {
  let nbProperty = 0
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      nbProperty++
    }
  }
  return nbProperty
}

module.exports.getTimeBetween = function(startDateInMs, endDateInMs) {
  const time = new Date()
  time.setSeconds(endDateInMs / 1000 - startDateInMs / 1000);
  time.setMinutes(endDateInMs / (1000 * 60) - startDateInMs / (1000 * 60));
  time.setHours(endDateInMs / (1000 * 60 * 60) - startDateInMs / (1000 * 60 * 60));
  return time
}

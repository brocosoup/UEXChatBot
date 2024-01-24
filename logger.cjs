module.exports = {
  log,
  setLogLevel
};

var logLevel = 0;

function log(message, level = -1) {
  if (level >= logLevel)
    console.log("LOGGER: " + message);
}

function setLogLevel(newLogLevel) {
  logLevel = newLogLevel
  return logLevel;
}
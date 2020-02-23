const types = {
  'ogr2ogr': require('./readers/ogr2ogr')
};
const Stream = require('stream');

module.exports = function(options) {

  var readStream = new Stream.Writable();
  var callbackPromise = {};
  var promise = new Promise((
    res,
    rej) => {
    callbackPromise.res = res;
    callbackPromise.rej = rej;
  });

  return {
    'open': function() {
      readStream = types[options.type](options);
      readStream.on('error', e => callbackPromise.rej(e));
      readStream.on('end', d => callbackPromise.res(d));
    },
    'stream': function() {
      return readStream;
    },
    'promise': function() {
      return promise;
    }
  };
};

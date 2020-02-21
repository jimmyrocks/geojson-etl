const ogr2ogr = require('ogr2ogr');

module.exports = function(options) {

  var readStream;
  var callbackPromise = {};
  var promise = new Promise((
    res,
    rej) => {
    callbackPromise.res = res;
    callbackPromise.rej = rej;
  });

  return {
    'open': function() {
      readStream = ogr2ogr(options.connectionString)
        .options(options.ogrOptions || [])
        .format('GeoJSON')
        .stream();

      readStream.on('error', e => callbackPromise.rej(e));
      readStream.on('end', d => callbackPromise.res(d));
    },
    'stream': readStream,
    'promise': promise
  };
};

const ogr2ogr = require('ogr2ogr');

module.exports = function(options) {
  return ogr2ogr(options.connectionString)
    .options(options.ogrOptions || [])
    .format('GeoJSONSeq')
    .timeout(options.timeout || 15000)
    .stream();
};

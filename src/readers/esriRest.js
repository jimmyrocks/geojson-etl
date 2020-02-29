const runList = require('../helpers/recursive-tasklist');
const post = require('../helpers/post-async');
const terraformer = require('terraformer-arcgis-parser');

const Stream = require('stream');

module.exports = function(options) {
  options['feature-count'] = isNaN(parseInt(options['feature-count'], 10)) ? undefined : parseInt(options['feature-count'], 10);
  /* Options
   * * connectionString: URL to the resource
   * * options:
   * *   where
   * */

  var writeStream = new Stream.Readable({
    read() {}
  });

  post(options.connectionString, {
      'f': 'json'
    })
    .then(source => startQuery(source, options, writeStream))
    .catch(e => writeStream.emit('error', e));

  return writeStream;
};

var startQuery = function(source, options, writer) {
  var fields = source.fields.filter(field => field.type !== 'esriFieldTypeGeometry').map(field => field.name);
  options['feature-count'] = options['feature-count'] || source.maxRecordCount;

  var tasklist = [];
  var errorCount = 0;

  var writeOut = function(data) {
    var terraformerOptions = {
      'sr': (data && data.spatialReference && (data.spatialReference.latestWkid || data.spatialReference.wkid)) || null
    };

    var writeList = [];
    var writeFeature = function(featureIdx) {
      return new Promise((res) => {
        var feature = data.features[featureIdx] || {};
        var geometry = null;
        var backpressure = false;

        try {
          if (feature.geometry) {
            geometry = terraformer.parse(feature.geometry, terraformerOptions);
          }
        } catch (e) {
          console.error('geometry error', feature.geometry);
        }

        if (geometry) {
          var subGeometry = geometry.toJSON();
          delete subGeometry.bbox;
          var dbGeometry = JSON.stringify(subGeometry, null, 0);
          var dbProperties = JSON.stringify(feature.attributes, null, 0);
          var geojsonDoc = `{"type": "Feature", "properties": ${dbProperties}, "geometry": ${dbGeometry}}`;
          backpressure = !writer.push(geojsonDoc);
        }

        if (featureIdx < data.features.length) {
          var nextWrite = {
            'name': 'Next Write',
            'description': 'Writes the next value',
            'task': writeFeature,
            'params': [featureIdx + 1]
          };
          if (!backpressure) {
            writeList.push(nextWrite);
            res();
          } else {
            var pipeOnce = writer._readableState.pipes.once || (writer._readableState.pipes[0] && writer._readableState.pipes[0].once);
            pipeOnce('drain', () => {
              writeList.push(nextWrite);
              res();
            });
          }
        } else {
          res();
        }
      });
    };

    if (data && data.features) {
      writeList.push({
        'name': 'Next Write',
        'description': 'Writes the next value',
        'task': writeFeature,
        'params': [0]
      });
      return runList(writeList);
    } else {
      return new Promise(res => res());
    }
  };

  var queueNextQuery = function(url, queryOptions, fields, split, terminalQuery) {
    var featureCount = (split && queryOptions.resultRecordCount) || options['feature-count'];
    var queries = [];
    return new Promise((res) => {
      if (terminalQuery) {
        // console.error('t', queryOptions.resultOffset, featureCount);
        queries = [];
      } else if (!split) {
        // console.error('n', queryOptions.resultOffset, featureCount);
        queries.push({
          'min': queryOptions.resultOffset + featureCount,
          'max': queryOptions.resultOffset + featureCount + featureCount,
          'terminalQuery': false
        });
      } else {
        // console.error('s', queryOptions.resultOffset, featureCount);
        queries.push({
          'min': queryOptions.resultOffset,
          'max': queryOptions.resultOffset + Math.floor(featureCount / 2),
          'terminalQuery': false
        });
        queries.push({
          'min': queryOptions.resultOffset + Math.floor(featureCount / 2),
          'max': queryOptions.resultOffset + featureCount,
          'terminalQuery': true
        });
      }

      queries.forEach(range => {
        tasklist.push({
          'name': 'Query ' + JSON.stringify(range),
          'description': 'Partial Extent Query',
          'task': runQuery,
          'params': [url, queryOptions, fields, range]
        });
      });
      res();
    });
  };

  var runQuery = function(url, rawOptions, fields, extent) {
    var esriOptions = JSON.parse(JSON.stringify(rawOptions));
    var terminalQuery = extent.terminalQuery;

    url = url.replace(/query\??$/ig, '');
    url = url + (url.substr(url.length - 1) === '/' ? '' : '/') + 'query';
    rawOptions.f = 'json';

    extent.min = extent.min === undefined ? 0 : extent.min;
    extent.max = extent.max === undefined ? options['feature-count'] : extent.max;

    esriOptions.where = esriOptions.where || '1=1';
    esriOptions.orderByFields = fields.map(f => '"' + f + '"').join(',');
    esriOptions.outFields = esriOptions.outFields || '*';
    esriOptions.returnGeometry = true;
    esriOptions.resultRecordCount = (extent.max - extent.min);
    esriOptions.resultOffset = extent.min;
    esriOptions.f = 'json';

    return post(url, esriOptions)
      .then(data => {
        return new Promise(resolve => {

          if (data.features && data.features.length) {
            if (data.features.length) {
              terminalQuery = terminalQuery || (data.features.length < esriOptions.resultRecordCount);
              queueNextQuery(url, esriOptions, fields, false, terminalQuery).then(() => {
                errorCount--;
                writeOut(data).then(() => {
                  resolve();
                });
              });
            } else {
              console.error('No features left');
              resolve('No features left');
            }
          } else {
            errorCount--;
            console.error('errored out', data);
            queueNextQuery(url, esriOptions, fields, true, terminalQuery).then(() => resolve());
          }
        });
      })
      .catch(e => {
        return new Promise((resolve, reject) => {
          if (e.code === 'ECONNRESET') {
            queueNextQuery(url, esriOptions, fields, true, terminalQuery).then(() => resolve());
          } else if (e.status === 502 || e.status === 504) {
            errorCount = errorCount <= 0 ? 0 : errorCount;
            errorCount++;
            if (errorCount > 10) {
              console.error('Too many errors');
              console.error(e.status, e.code);
              reject(e);
            }
            setTimeout(function() {
              queueNextQuery(url, esriOptions, fields, true, terminalQuery).then(() => resolve());
            }, 1500 * errorCount);
          } else {
            reject(e);
          }
        });
      });
  };

  tasklist.push({
    'name': 'First Query',
    'description': 'Starts off the query',
    'task': runQuery,
    'params': [options.connectionString, options.esriOptions || {}, fields, source.extent]
  });

  runList(tasklist)
    .then(() => writer.push(null))
    .catch(e => writer.emit('error', e));
};

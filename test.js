var Reader = require('./src/reader');
var Writer = require('./src/writer');

var source2 = {
  'type': 'ogr2ogr',
  'connectionString': '/code/test.geojson',
  'ogrOptions': [
  ]
};

var queryObj = {
  'where': '"OBJECTID" IS NOT null',
  'outFields': '*',
  'outSR': '4326',
  'orderByFields': 'OBJECTID',
  'f': 'json'
};

var query = Object.keys(queryObj).map(key =>
  key + '=' + encodeURIComponent(queryObj[key])
).join('&');
var source2 = {
  'type': 'ogr2ogr',
  'connectionString': 'https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_POIs/FeatureServer/0/query?' + query,
  'timeout': 25000,
  'ogrOptions': []
};

var source = {
  'type': 'esriRest',
  'connectionString': 'https://carto.nationalmap.gov/arcgis/rest/services/govunits/MapServer/19',
  // 'connectionString': 'https://carto.nationalmap.gov/arcgis/rest/services/structures/MapServer/17',
  // 'connectionString': 'https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails_Geographic/MapServer/0',
  // 'connectionString': 'https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_POIs_Geographic/MapServer/0',
  // 'connectionString': 'https://maps.pasda.psu.edu/arcgis/rest/services/pasda/NationalParkService/MapServer/0',
  // 'feature-count': 100,
  'method': 'paginated',
  'esriOptions': {
    'where': 'OBJECTID IS NOT NULL'
  }
};


var dest2 = {
  'type': 'stdout'
};

var dest = {
  'type': 'sqlite',
  'tableName': 'geojson',
  'geomColumn': 'the_geom',
  'geomFormat': 'Wkt',
  'output': '/code/usgs_govunits_inc_places.sqlite'
};

var ogrReader = new Reader(source);
var ogrWriter = new Writer(dest);

ogrWriter.streamReader(ogrReader)
  .then(r => console.error('\ndone', r))
  .catch(e => console.error('\nerror', e));

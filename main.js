import Circle from 'ol/geom/Circle.js';
import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style.js';
import {OSM, Vector as VectorSource} from 'ol/source.js';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer.js';
import WMTS from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import {get as getProjection} from 'ol/proj.js';
import {getTopLeft, getWidth} from 'ol/extent.js';
import Icon from 'ol/style/Icon';
import Point from 'ol/geom/Point.js';


const iconPath = 'data/atm.png';
const image = new Icon({
  anchor: [0.5, 1],      // Set anchor point, [0.5, 1] means bottom center
  src: iconPath,         // Path to your icon image
  scale: 0.11,  
});
const styles = {
  'Point': new Style({
    image: image,
  }),
  'LineString': new Style({
    stroke: new Stroke({
      color: 'red',
      width: 2,
    }),
  }),
};

const styleFunction = function (feature) {
  return styles[feature.getGeometry().getType()];
};

const styleFunction1 = function (feature) {
  const geometry = feature.getGeometry();
  const styles = [
    // linestring
    new Style({
      stroke: new Stroke({
        color: '#ffcc33',
        width: 2,
      }),
    }),
  ];

  geometry.forEachSegment(function (start, end) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const rotation = Math.atan2(dy, dx);
    // arrows
    styles.push(
      new Style({
        geometry: new Point(end),
        image: new Icon({
          src: 'data/arrow.png',
          anchor: [0.75, 0.5],
          rotateWithView: true,
          rotation: -rotation,
        }),
      })
    );
  });

  return styles;
};

const projection = getProjection('EPSG:3857');
const projectionExtent = projection.getExtent();
const size = getWidth(projectionExtent) / 256;
const resolutions = new Array(19);
const matrixIds = new Array(19);
for (let z = 0; z < 19; ++z) {
  // generate resolutions and matrixIds arrays for this WMTS
  resolutions[z] = size / Math.pow(2, z);
  matrixIds[z] = z;
}

const tileLayer =  new TileLayer({
      source: new WMTS({
        attributions:
          'Barbie Land',
        url: 'http://127.0.0.1:8000/wmts',
        layer: '/Users/bair/cash-machines-app/static/barbie_world_map_moscow.mbtiles',
        matrixSet: 'GoogleMapsCompatible',
        format: 'image/png',
        projection: projection,
        tileGrid: new WMTSTileGrid({
          origin: getTopLeft(projectionExtent),
          resolutions: resolutions,
          matrixIds: matrixIds,
        }),
        style: 'default',
        wrapX: true,

      }),
      opacity: 0.7
  });

const osmLayer = new TileLayer({
  source: new OSM(),
});

const atms_geojson = 'http://127.0.0.1:8000/api/v1/atm_geojson';
const route_geojson = 'http://127.0.0.1:8000/api/v1/route';


// Make a GET request using fetch
async function getGeoJSON(jsonUrl){
  return fetch(jsonUrl) 
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(jsonData => {
      // console.log(jsonData)
      return jsonData;
    })
    .catch(error => {
      console.error('Error fetching JSON:', error);
    });
  }

async function main() {
  const atms_jsonData = await getGeoJSON(atms_geojson);
  const route_jsonData = await getGeoJSON(route_geojson);

  var atmsSource = new VectorSource({
    features: new GeoJSON().readFeatures(atms_jsonData, {
      dataProjection: 'EPSG:4326', 
      featureProjection: 'EPSG:3857'
    })
  });

  var routeSource = new VectorSource({
    features: new GeoJSON().readFeatures(route_jsonData, {
      dataProjection: 'EPSG:4326', 
      featureProjection: 'EPSG:3857'
    })
  });  

  const routeLayer = new VectorLayer({
    source: routeSource,
    style: styleFunction1,
  });

  const atmsLayer = new VectorLayer({
    source: atmsSource,
    style: styleFunction,
  });

  const map = new Map({
    layers: [
      osmLayer,
      tileLayer,
      atmsLayer,  
      routeLayer,
    ],
    target: 'map',
    view: new View({
      center: [4189113,7508825],
      zoom: 12,
      maxZoom: 20,
    }),
  });


  function createTable(routeList) {
    const table = document.createElement('table');
    const headerRow = table.insertRow(0);
    const headerCell1 = headerRow.insertCell(0);
    headerCell1.textContent = 'id';

    const headerCell2 = headerRow.insertCell(1);
    headerCell2.textContent = 'address';
    
    for (const point of routeList) {
      const pointNumber = Object.keys(point)[0];
      const pointDescription = point[pointNumber];

      const row = table.insertRow();
      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);

      cell1.textContent = `${pointNumber}`;
      cell2.textContent = pointDescription;
    }

    return table;
  }

  const routeList = route_jsonData.features[0].properties.route_list;
  const table = createTable(routeList);
  document.body.appendChild(table);

}
main();

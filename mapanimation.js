const btn = document.querySelector('button');

// TODO: add your own access token
mapboxgl.accessToken = 'pk.eyJ1IjoibWFya29nYXJ6YSIsImEiOiJja2x2N2d6cjMwcTdlMnBsbzVqNTN6bjU4In0.7EmW2ixiQPyAni918MPmNg';

// This array contains the coordinates for all bus stops between MIT and Harvard
const busStops = [
	[ -71.093729, 42.359244 ],
	[ -71.094915, 42.360175 ],
	[ -71.0958, 42.360698 ],
	[ -71.099558, 42.362953 ],
	[ -71.103476, 42.365248 ],
	[ -71.106067, 42.366806 ],
	[ -71.108717, 42.368355 ],
	[ -71.110799, 42.369192 ],
	[ -71.113095, 42.370218 ],
	[ -71.115476, 42.372085 ],
	[ -71.117585, 42.373016 ],
	[ -71.118625, 42.374863 ]
];

let pointsCreated = false;

// Create the map object using mapboxgl.map() function
let map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/navigation-guidance-night-v4',
	center: [ -71.106067, 42.366806 ],
	zoom: 14.1
});

for (stop of busStops) {
	let marker = new mapboxgl.Marker({ color: '#536dfe' }).setLngLat([ stop[0], stop[1] ]).addTo(map);
}

async function run() {
	const locations = await getBusLocations();

	for (let i = 0; i < locations.length; i++) {
		const long = locations[i].attributes.longitude;
		const lat = locations[i].attributes.latitude;

		let size = 100;

		let pulsingDot = {
			width: size,
			height: size,
			data: new Uint8Array(size * size * 4),

			// get rendering context for the map canvas when layer is added to the map
			onAdd: function() {
				var canvas = document.createElement('canvas');
				canvas.width = this.width;
				canvas.height = this.height;
				this.context = canvas.getContext('2d');
			},

			// called once before every frame where the icon will be used
			render: function() {
				var duration = 1000;
				var t = (performance.now() % duration) / duration;

				var radius = size / 2 * 0.3;
				var outerRadius = size / 2 * 0.7 * t + radius;
				var context = this.context;

				// draw outer circle
				context.clearRect(0, 0, this.width, this.height);
				context.beginPath();
				context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
				context.fillStyle = 'rgba(255, 200, 200,' + (1 - t) + ')';
				context.fill();

				// draw inner circle
				context.beginPath();
				context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
				context.fillStyle = 'rgba(255, 100, 100, 1)';
				context.strokeStyle = 'white';
				context.lineWidth = 2 + 4 * (1 - t);
				context.fill();
				context.stroke();

				// update this image's data with data from the canvas
				this.data = context.getImageData(0, 0, this.width, this.height).data;

				// continuously repaint the map, resulting in the smooth animation of the dot
				map.triggerRepaint();

				// return `true` to let the map know that the image was updated
				return true;
			}
		};
		map.addImage(`pulsing-dot${i}`, pulsingDot, { pixelRatio: 2 });
		map.addSource(`points${i}`, {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						geometry: {
							type: 'Point',
							// coordinates: [ long, lat ]
							coordinates: [ long, lat ]
						}
					}
				]
			}
		});
		map.addLayer({
			id: `points${i}`,
			type: 'symbol',
			source: `points${i}`,
			layout: {
				'icon-image': `pulsing-dot${i}`
			}
		});
	}
	setTimeout(() => {
		for (let i = 0; i < locations.length; i++) {
			map.removeLayer(`points${i}`);
			map.removeSource(`points${i}`);
			map.removeImage(`pulsing-dot${i}`);
		}
		run();
	}, 5000);
}

async function getBusLocations() {
	const url = 'https://api-v3.mbta.com/vehicles?filter[route]=1&include=trip';
	const response = await fetch(url);
	const data = await response.json();
	return data.data;
}

btn.addEventListener('click', run);

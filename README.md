## Overlay Tiler

Image overlay fixer for Google Maps.

### Usage

Basic initialize:
```js
// Set a map
var map = new google.maps.Map(document.getElementById('map-canvas'), {
	zoom: 15,
	center: {lat: 51.5, lng: 0.12},
	mapTypeId: google.maps.MapTypeId.SATELLITE});

// Only need the src for loading an image.
// For re-loading, an image bounds can be set.
var imgOverlay = {
	src: 'https://dl.dropboxusercontent.com/u/153646388/NBA-map/47996030100399490707no.jpg'
//	ne: {
//  	lat: 51.02417529082717,
//  	lng: -0.031757354736328125
//  },
//  sw: {
//  	lat: 50.98599087089921,
//  	lng: -0.07381439208984375
//  }
}

// Calling the Load method with the image-overlay object and the map.
// Getting the GM overlay object in the callback.
overlaytiler.Load(imgOverlay, map, function(overlay) {

	// Use the overlay.getDotLatLngs() method for getting the image bounds.
	// Implement the overlay.afterRender hook for constantly updated.

})
```
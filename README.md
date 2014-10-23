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

// Load the image overlay.
var overlay = new OverlayTiler( imageOverlay, map );

```

Hooks:
```js

//  Run after image load.
overlay.afterLoad() = function() {};

// Run after overlay added.
overlay.afterAdd() = function() {};

// Run after each overlay render
overlay.afterRender() = function() {};

```

Functions:
```js

//  Return the current bounds of the image.
var bounds = overlay.getImgBounds();

```

Usage Example:
```js

// Initialize an overlay.
var overlay = new OverlayTiler( imageOverlay, map );

// Constantly update.
overlay.afterRender = function () {

	// Get the current image bounds.
	var bounds = overlay.getImgBounds();
	var sw = bounds.getSouthWest();
	var ne = bounds.getNorthEast();

	// Set an updated output.
	var output = '';
	output += 'SW lat: ' + sw.lat() + '<br>';
	output += 'SW lng: ' + sw.lng() + '<br>';
	output += 'NE lat: ' + ne.lat() + '<br>';
	output += 'NE lng: ' + ne.lng();

	// Update the DOM.
	document.getElementById( 'bounds' ).innerHTML = output;

}

```


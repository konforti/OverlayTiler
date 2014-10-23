(function () {
  /**
   * Initialize Google Maps map.
   */
  function init() {
    var mapOptions = {
      zoom     : 15,
      center   : {lat: 51.5, lng: 0.12},
      minZoom: 3,
      mapTypeId: google.maps.MapTypeId.SATELLITE
    };

    var map = new google.maps.Map( document.getElementById( 'map-canvas' ), mapOptions );

    // Get the data from the server.
    var imageOverlay = {
      src: document.getElementById( 'img-url' ).value
    };

    function load() {
      var overlay = new OverlayTiler(imageOverlay, map);
      overlay.afterRender = function () {

        var bounds = overlay.getImgBounds();
        var sw = bounds.getSouthWest();
        var ne = bounds.getNorthEast();

        var output = '';
        output += 'SW lat: ' + sw.lat() + '<br>';
        output += 'SW lng: ' + sw.lng() + '<br>';
        output += 'NE lat: ' + ne.lat() + '<br>';
        output += 'NE lng: ' + ne.lng();


        document.getElementById( 'bounds' ).innerHTML = output;
      }
    }

    load();
    document.getElementById( 'img-url' ).addEventListener( 'change', function () {
      imageOverlay.src = this.value;
      load();
    } )
  }

  // Lets start.
  google.maps.event.addDomListener( window, 'load', init );

})()

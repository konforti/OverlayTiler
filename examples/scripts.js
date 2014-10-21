(function () {
  /**
   * Initialize Google Maps map.
   */
  function init() {
    var mapOptions = {
      zoom     : 15,
      center   : {lat: 51.5, lng: 0.12},
      mapTypeId: google.maps.MapTypeId.SATELLITE
    };

    var map = new google.maps.Map( document.getElementById( 'map-canvas' ), mapOptions );

    // Get the data from the server.
    var imageOverlay = {
      src: document.getElementById( 'img-url' ).value
    };

    function load() {
      overlaytiler.Load( imageOverlay, map, function ( overlay ) {
        overlay.afterRender = function () {
          var output = '';
          var bounds = overlay.getImgBounds();
          var sw = bounds.getSouthWest();
          var ne = bounds.getNorthEast();
          output += 'SW lat: ' + sw.lat() + '<br>';
          output += 'SW lng: ' + sw.lng() + '<br>';
          output += 'NE lat: ' + ne.lat() + '<br>';
          output += 'NE lng: ' + ne.lng();


          document.getElementById( 'bounds' ).innerHTML = output;
        }
      } );
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

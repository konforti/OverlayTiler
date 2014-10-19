(function() {
  /**
   * Initialize Google Maps map.
   */
  function init() {
    var mapOptions = {
      zoom: 15,
      center: {lat: 51.5, lng: 0.12},
      mapTypeId: google.maps.MapTypeId.SATELLITE
    };

    var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    // Get the data from the server.
    var data = {
      markers: [{lat: 51.5, lng: 0.12}, {lat: 51.5, lng: 0.11}],
      overlay: {
        src: 'https://dl.dropboxusercontent.com/u/153646388/NBA-map/47996030100399490707no.jpg',
//        ne: {
//          lat: 51.02417529082717,
//          lng: -0.031757354736328125
//        },
//        sw: {
//          lat: 50.98599087089921,
//          lng: -0.07381439208984375
//        }
      }
    };

    if (typeof data.overlay !== 'undefined') {
      overlaytiler.Load(data.overlay, map, function(overlay) {
        overlay.afterRender = function() {
          var output = '';
          var dots = overlay.getDotLatLngs();
          output += 'NE lat: ' + dots[0].lat() + '<br>';
          output += 'NE lng: ' + dots[0].lng() + '<br>';
          output += 'SW lat: ' + dots[1].lat() + '<br>';
          output += 'SW lng: ' + dots[1].lng();

          document.getElementById('bounds').innerHTML = output;
        }
      });
    }
  }

  // Lets start.
  google.maps.event.addDomListener(window, 'load', init);

})()

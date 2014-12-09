
var map;
var homeMarker = null;
var circle = null;
var globPosition = null;
var infowindow = [];
var markers = [];
var allResults = [];
var zcount = 9999;
var overlay = new google.maps.OverlayView();

function initialize() {

  map = new google.maps.Map(document.getElementById('map-canvas'), {
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  var defaultBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(49.9662639,-126.6311303),
      new google.maps.LatLng(23.0920335,-70.8836669));

  map.fitBounds(defaultBounds);

  // Create the search box and link it to the UI element.
  var input = /** @type {HTMLInputElement} */(
      document.getElementById('pac-input'));
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  var searchBox = new google.maps.places.SearchBox(
    /** @type {HTMLInputElement} */(input));

  // [START region_getplaces]
  // Listen for the event fired when the user selects an item from the
  // pick list. Retrieve the matching places for that item.
  google.maps.event.addListener(searchBox, 'places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }
    newPosition(places[0].geometry.location);
  });
  // [END region_getplaces]

  // Try HTML5 geolocation
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = new google.maps.LatLng(position.coords.latitude,
                                       position.coords.longitude);

      newPosition(pos);
    }, function() {
    });
  }

  
}

function newPosition(position) {
  globPosition = position;
  map.setCenter(position);

  if (homeMarker == null) {
    homeMarker = new google.maps.Marker({
      map: map,
      position: position,
      title: 'Some location'
    });
  }
  else {
    homeMarker.setPosition(position);
  }

  if (circle == null){
    circle = new google.maps.Circle({
      map: map,
      radius: document.getElementById('radius').value * 1609,    // 10 miles in metres
      strokeColor: '#000',
      strokeOpacity: 0.5,
      strokeWeight: 1,
      fillColor: '#FFF',
      fillOpacity: 0.3
    });
    circle.bindTo('center', homeMarker, 'position');
  }

  map.fitBounds(circle.getBounds());
}

google.maps.event.addDomListener(window, 'load', initialize);

function init(){
  document.getElementById("searchSubmit").addEventListener("click", function(){
    search();
  });
  document.getElementById("radius").onkeydown=function(key){
    if (key.keyCode == 13 && globPosition != null)
      search();
  }
}

function search(){
  var radius = parseFloat(document.getElementById("radius").value) * 1609;
  var selectedElements = document.getElementById('places').selectedOptions;
  var openNow = document.getElementById('open').checked;
  var keyword = document.getElementById('keyword').value;
  var placeName = document.getElementById('name').value;
  var minPrice = document.getElementById('minPriceLevel').value;
  var maxPrice = document.getElementById('maxPriceLevel').value;
  var service = new google.maps.places.PlacesService(map);
  var selectedValues = [];

  var len = selectedElements.length;
  for (var i=0;i<len;i++)
    selectedValues.push(selectedElements[i].value)

  var request = {
    location: globPosition,
    radius: radius,
    types: selectedValues,
    openNow: openNow,
    keyword: keyword,
    minPriceLevel: minPrice,
    maxPriceLevel: maxPrice,
    name: placeName
  };

  circle.setRadius(radius);
  map.fitBounds(circle.getBounds());
  allResults = [];

  if (selectedValues.length != 0){
    if (overlay) overlay.setMap();
    service.nearbySearch(request, callback);
  }
}

function callback(results, status, pagination) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    console.log(results);
    allResults = allResults.concat(results);
    if (pagination.hasNextPage)
      pagination.nextPage();
    else {
      populateResults();
      d3Callback();
    }
  }
}

var populateResults = function(){
  var resultsElement = document.getElementById('results');
  var html = '';
  allResults.forEach(function(item){
    html += "<div>" + item.name + "</div>";
  });
  resultsElement.innerHTML = html;
}

function d3Callback(){

  // Add the container when the overlay is added to the map.
  overlay.onAdd = function() {
    var layer = d3.select(this.getPanes().overlayLayer).append("div")
        .attr("class", "stations");

    // Draw each marker as a separate SVG element.
    // We could use a single SVG, but what size would it have?
    overlay.draw = function() {
      var projection = this.getProjection(),
          padding = 10;

      var marker = layer.selectAll("svg")
          .data(allResults)
          .each(transform) // update existing markers
        .enter().append("svg:svg")
          .each(transform)
          .attr("class", "marker");

      // Add a circle.
      marker.append("svg:circle")
          .attr("r", 4.5)
          .attr("cx", padding)
          .attr("cy", padding);

      // Add a label.
      marker.append("div")
          .attr("class", "test")
          .attr("x", padding + 7)
          .attr("y", padding)
          .attr("dy", ".31em")
          .text(function(d) { return d.name; });

      function transform(d) {
        d = projection.fromLatLngToDivPixel(d.geometry.location);
        return d3.select(this)
            .style("left", (d.x - padding) + "px")
            .style("top", (d.y - padding) + "px");
      }
      overlay.onRemove = function(){
        layer.transition().duration(500).style("opacity",0).remove();
      };
    };
  };

  // Bind our overlay to the map…
  overlay.setMap(map);
}
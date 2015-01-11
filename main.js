
var map;
var homeMarker = null;
var circle = null;
var globPosition = null;
var infowindow = [];
var markers = [];
var allResults = [];
var zcount = 9999;
var resultsElement;
var idCounter = 0;


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
  resultsElement = document.getElementById('results');
  document.getElementById("searchSubmit").addEventListener("click", function(){
    search();
  });
  document.getElementById("radius").onkeydown=function(key){
    if (key.keyCode == 13 && globPosition != null)
      search();
  }
}

function search(){
  var radius = parseFloat(document.getElementById("radius").value) * 1609.34;
  var opts = document.getElementById('places').selectedOptions;
  var service = new google.maps.places.PlacesService(map);
  var selectedElements = document.getElementById('places').selectedOptions;
  var selectedValues = [];
  resultsElement.innerHTML = "";
  for (var i=0;i<selectedElements.length;i++)
    selectedValues.push(selectedElements[i].value)
  var request = {
    location: globPosition,
    radius: radius,
    types: selectedValues,
    openNow: document.getElementById('open').checked
  };

  for (var i=0;i<infowindow.length;i++) {
    infowindow[i].close();
  }

  infowindow = [];

  circle.setRadius(radius);
  map.fitBounds(circle.getBounds());
  if (selectedValues.length != 0)
    service.nearbySearch(request, callback);
}

function callback(results, status, pagination) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    for (var i = 0; i < results.length; i++) {
      // resultsElement.innerHTML += "<div id='result" + ++idCounter + "' class='resultItem'>" + results[i].name + "</div>";
      // result[i].idd = "result" + idCounter;
      createMarker(results[i]);
    }

    if (pagination.hasNextPage)
      pagination.nextPage();
  }
}

function createMarker(place) {
  var l = infowindow.push(new google.maps.InfoWindow({'position': place.geometry.location, 'maxWidth':500})) - 1;
  infowindow[l].setContent("<div class='unopened'>" + place.name + " " + (place.rating ? place.rating : "") + "</div>");
  infowindow[l].open(map);
  infowindow[l].cplace = place;

  google.maps.event.addListenerOnce (infowindow[l],'domready',function(){
    if (this.H.getContentNode().parentNode.parentNode.parentNode.style.class != 'infos'){
      this.H.getContentNode().parentNode.parentNode.parentNode.className = 'infos';
      this.H.getContentNode().parentNode.parentNode.parentNode.addEventListener('click',onMarkClick);
      this.H.getContentNode().parentNode.parentNode.parentNode.iteration = l;
    }
  });

  var onMarkClick = function(){      
    clickedInfoWindow = infowindow[this.iteration];
    if (this.id != "theGuy"){

      minimize(null);
      this.id = "theGuy";

      var request = {
        placeId: clickedInfoWindow.cplace.place_id
      };
      var service = new google.maps.places.PlacesService(map);

      service.getDetails(request, function(detailPlace, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          clickedInfoWindow.setContent(
            "<div class='opened'><b>" + 
            detailPlace.name + "</b><br>" + 
            ((detailPlace.formatted_phone_number != undefined) ? (detailPlace.formatted_phone_number + "<br>") : "") +
            ((detailPlace.formatted_address != undefined) ? (detailPlace.formatted_address + "<br>") : "") +
            ((detailPlace.rating != undefined) ? ("Rating: " + detailPlace.rating + "<br>") : "") +
            ((detailPlace.price_level != undefined) ? ("Price Level (1-5): " + detailPlace.price_level + "<br>") : "") + 
            "<p>" + 
            ((detailPlace.website != undefined) ? ("<a target='_blank' href='" + detailPlace.website + "'>Location Website</a><br>") : "") +
            "<a target='_blank' href='" + detailPlace.url + "'>Google Places Website</a><br>" +
            "<a target='_blank' href='https://www.google.com/maps/dir/current+location/" + clickedInfoWindow.cplace.geometry.location.toString().slice(1,-1) + "/'>Navigate</a><br>" +
            "</p><div class='minimize' id='minimizer'>Minimize</div>" +
            "</div>"
          );
          document.getElementById("minimizer").addEventListener('click',minimize);
        }
      });
      clickedInfoWindow.setZIndex(zcount++);
    }   
  }
}

function minimize(event){
  if (event != null)
    event.stopPropagation();
  var oldElement = document.getElementById('theGuy');
  if (oldElement != null){
    oldElement.removeAttribute('id');
    var oldInfoWindow = infowindow[oldElement.iteration];
    oldInfoWindow.setContent(oldInfoWindow.cplace.name);
  }
}

function minimizePane(){
  console.log('hey');
  e = document.getElementById('hider');
  console.log(e);
  if(e.style.display == 'block')
    e.style.display = 'none';
  else
    e.style.display = 'block';
}
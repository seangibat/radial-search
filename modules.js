var Radial = (function(){
  var map, homeMarker, circle, overlay, service, selectedPosition, allResults, overlay;
  var resultsContainer, radiusInput, categoriesInput, openCheckbox, keywordInput,
    placeNameInput, minPriceDropdown, maxPriceDropdown;

  var initializeDomVars = function(){
    resultsContainer = document.getElementById('results');
    radiusInput = document.getElementById('radius');
    categoriesInput = document.getElementById('places');
    openCheckbox = document.getElementById('open');
    keywordInput = document.getElementById('keyword');
    placeNameInput = document.getElementById('name');
    minPriceDropdown = document.getElementById('minPriceLevel');
    maxPriceDropdown = document.getElementById('maxPriceLevel');
  }

  var initializeMap = function() {
    var input, searchBox;

    map = new google.maps.Map(document.getElementById('map-canvas'), {
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    map.fitBounds(new google.maps.LatLngBounds(
      new google.maps.LatLng(85,-180),
      new google.maps.LatLng(-85,180)
    ));

    input = (document.getElementById('pac-input'));
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    searchBox = new google.maps.places.SearchBox(input);
    google.maps.event.addListener(searchBox, 'places_changed', function() {
      var places = searchBox.getPlaces();
      if (places.length > 0) {
        newPosition(places[0].geometry.location);
      }
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        newPosition(pos);
      }, function(){});
    }

    service = new google.maps.places.PlacesService(map);
    
    overlay = new google.maps.OverlayView();

    homeMarker = new google.maps.Marker({
      map: map,
      title: 'Some location'
    });

    circle = new google.maps.Circle({
      map: map,
      radius: document.getElementById('radius').value * 1609,
      strokeColor: '#000',
      strokeOpacity: 0.5,
      strokeWeight: 1,
      fillColor: '#FFF',
      fillOpacity: 0.3
    });
    circle.bindTo('center', homeMarker, 'position');
  }

  var init = function(){
    initializeMap();
    initializeDomVars();

    document.getElementById("searchSubmit").addEventListener("click", searchHandler);
    document.getElementById("radius").addEventListener('onkeydown', keyPressSearchHandler);
  }

  var keyPressSearchHandler = function(key){
    if (key.keyCode === 13 && selectedPosition !== null && selectedPosition !== undefined){
      searchHandler();
    }
  }

  var newPosition = function(position) {
    selectedPosition = position;
    homeMarker.setPosition(position);
    map.fitBounds(circle.getBounds());
  }

  var searchHandler = function(){
    var radius = parseFloat(radiusInput.value) * 1609;
    var selectedElements = categoriesInput.selectedOptions;
    var openNow = openCheckbox.checked;
    var keyword = keywordInput.value;
    var placeName = placeNameInput.value;
    var minPrice = minPriceDropdown.value;
    var maxPrice = maxPriceDropdown.value;

    var selectedValues = [];
    var len = selectedElements.length;
    for (var i=0;i<len;i++){
      selectedValues.push(selectedElements[i].value)
    }

    var request = {
      location: selectedPosition,
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
      if (overlay) overlay.setMap();  // resets overlay
      emptyResultsList();
      service.nearbySearch(request, searchResultsCallback);
    }
  }

  var searchResultsCallback = function(results, status, pagination) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      allResults = allResults.concat(results);
      if (pagination.hasNextPage)
        pagination.nextPage();
      else {
        populateResultsList();
        populateResultsMap();
      }
    }
  }

  var populateResultsList = function(){
    var html = '';
    allResults.forEach(function(item){
      html += "<li class='resultItem'>" + item.name + "</li>";
    });
    resultsContainer.innerHTML = html;
  }

  var emptyResultsList = function(){
    resultsContainer.innerHTML = '';
  }

  var populateResultsMap = function(){

    overlay.onAdd = function() {
      var layer = d3.select(this.getPanes().overlayLayer).append("div").attr("class", "stations");

      overlay.draw = function() {
        var projection = this.getProjection(), padding = 10;

        var marker = layer.selectAll("svg")
            .data(allResults)
            .each(transform) // update existing markers
          .enter().append("svg:svg")
            .each(transform)
            .attr("class", "marker");

        marker.append("svg:circle")
            .attr("r", 4.5)
            .attr("cx", padding)
            .attr("cy", padding);

        marker.append("text")
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

    overlay.setMap(map);
  }
  
  return {
    init : init
  }
})();
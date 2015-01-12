var Radial = (function(){
  var map, homeMarker, circle, overlay, service, selectedPosition, overlay;
  var resultsContainer, radiusInput, categoriesInput, openCheckbox, keywordInput, zcount = 999999,
    placeNameInput, minPriceDropdown, maxPriceDropdown, infoWindowTemplate, infoWindows = [];

  var initializeDomVars = function(){
    resultsContainer = document.getElementById('results');
    radiusInput = document.getElementById('radius');
    categoriesInput = document.getElementById('places');
    openCheckbox = document.getElementById('open');
    keywordInput = document.getElementById('keyword');
    placeNameInput = document.getElementById('name');
    minPriceDropdown = document.getElementById('minPriceLevel');
    maxPriceDropdown = document.getElementById('maxPriceLevel');
    infoWindowTemplate = _.template($('#info-window-template').html());
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

    $('#theform').on('submit', searchHandler);
    $(document).on('click', '.infos', onMarkClick);
    $(document).on('click', '#selectedInfoWindow a', function(even){
      event.stopPropagation();
    });

  };

  var newPosition = function(position) {
    selectedPosition = position;
    homeMarker.setPosition(position);
    map.fitBounds(circle.getBounds());
  }

  var searchHandler = function(e){
    e.preventDefault();

    $('#loaderGif').show();

    infoWindows.forEach(function(infoWindow){
      infoWindow.close();
    });

    var radius = parseFloat(radiusInput.value) * 1609;
    var selectedElements = categoriesInput.selectedOptions;
    var openNow = openCheckbox.checked;
    var keyword = keywordInput.value;
    var placeName = placeNameInput.value;
    var minPrice = minPriceDropdown.value;
    var maxPrice = maxPriceDropdown.value;
    infoWindows = [];

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

    var counter = 0;

    var searchResultsCallback = function(results, status, pagination) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++){
          counter++;
          createMarker(results[i]);
        }
        if (pagination.hasNextPage)
          pagination.nextPage();
        else {
          $('#loaderGif').hide();
          $('#resultNum').text(counter + " results found.")
        }
      }
    }

    if (selectedValues.length != 0){
      if (overlay) overlay.setMap();  // resets overlay
      service.nearbySearch(request, searchResultsCallback);
    }
  }

  var createMarker = function(place) {
    var infoWindow = new google.maps.InfoWindow({'position': place.geometry.location, 'maxWidth':500}),
        spot = infoWindows.length;
    infoWindow.setContent("<div class='unopened'>" + place.name + " " + (place.rating ? place.rating : "") + "</div>");
    infoWindow.cplace = place;
    infoWindow.open(map);
    infoWindows.push(infoWindow);

    console.log(infoWindows);


    google.maps.event.addListenerOnce (infoWindow,'domready',function(){
      infoWindow.$el = $(this.H.getContentNode()).parent().parent().parent();
      infoWindow.$el.addClass('infos').data('iteration', spot);
    });
  }



  var onMarkClick = function(){      
    var clickedInfoWindow = infoWindows[$(this).data('iteration')];
    if (this.id != "selectedInfoWindow"){

      minimizeInfoWindow(null);
      this.id = "selectedInfoWindow";
      clickedInfoWindow.setZIndex(zcount++);

      var request = {
        placeId: clickedInfoWindow.cplace.place_id
      };

      service.getDetails(request, function(detailPlace, status) {
        console.log(clickedInfoWindow);
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          console.log(detailPlace);
          clickedInfoWindow.setContent(infoWindowTemplate({
            detailPlace: detailPlace, 
            navigationString: clickedInfoWindow.cplace.geometry.location.toString().slice(1,-1) 
          }));
        }
      });
    }   
    else {
      minimizeInfoWindow();
    }
  }

  var minimizeInfoWindow = function(event){
    if (event !== null && event !== undefined)
      event.stopPropagation();
    var oldElement = document.getElementById('selectedInfoWindow');
    if (oldElement != null){
      oldElement.removeAttribute('id');
      var oldInfoWindow = infoWindows[$(oldElement).data('iteration')];
      oldInfoWindow.setContent(oldInfoWindow.cplace.name);
    }
  }

  return {
    init:init,
    infoWindows: function(){ return infoWindows }
  }

})();


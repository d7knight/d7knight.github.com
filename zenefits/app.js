
//Google Maps and Places App for Zenefits by David Knight

function initialize() {
    //Custom Map Styles
    var myStyles = [
        {
            featureType: "poi",
            elementType: "labels",
            stylers: [
                {visibility: "off"}
            ]
        }, {
            featureType: "road",
            elementType: "geometry",
            stylers: [
                {lightness: 100},
                {visibility: "simplified"}
            ]
        }, {
            featureType: "road",
            elementType: "labels",
            stylers: [
                {visibility: "on"}
            ]
        }, {
            featureType: "transit",
            elementType: "labels",
            stylers: [
                {visibility: "off"}
            ]
        }

    ];
    //San Fransisco Geo Coordinates
    var sanFransisco = new google.maps.LatLng(37.7833, -122.4167);

    //Custom Map options
    var mapOptions = {
        center: sanFransisco,
        zoom: 12,
        panControl: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        overviewMapControl: false,
        styles: myStyles
    };


    //Custom Place Information Window, displayed after clicking on a marker
    var infowindow = new InfoBubble({
        map: map,
        content: '<div class="phoneytext">Some label</div>',
        shadowStyle: 1,
        padding: 3,
        backgroundColor: 'white',
        borderRadius: 12,
        arrowSize: 10,
        borderWidth: 1,
        borderColor: '#2c2c2c',
        disableAutoPan: false,
        hideCloseButton: true,
        arrowPosition: 50,
        backgroundClassName: 'phoney',
        arrowStyle: 3,
        minWidth: 200,
        maxWidth: 400
    });

    var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    var service = new google.maps.places.PlacesService(map);

    var input = /** @type {HTMLInputElement} */
        (document.getElementById('pac-input'));

    //Marker cluster - makes it easier to view maps with overlapping markers
    var mc = new MarkerClusterer(map);
    var searchBox = new google.maps.places.SearchBox(input);
    var markers = [];

    //initializing input listener
    input.onkeyup = function (e) {
        setTimeout(function () {
            var places = document.querySelectorAll('.pac-item');
            for (var i = 0; i < places.length; i++) {
                var place = places[i];
                var pac_icon = place.querySelector('.pac-icon').outerHTML
                var place_name_reduced = place.querySelector('.pac-item-query').outerHTML;
                place.innerHTML = pac_icon + place_name_reduced;
            }
        }, 150);
    }

    //places changed listener
    google.maps.event.addListener(searchBox, 'places_changed', function () {
        mc.clearMarkers();
        input.value = input.value.split(',')[0];

        //retrieve the places matching the input query
        var places = searchBox.getPlaces();
        for (var i = 0, marker; marker = markers[i]; i++) {
            marker.setMap(null);
        }
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0, place; place = places[i]; i++) {
            //marker image
            var image = {
                url: place.icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25)
            };
            //marker
            var marker = new google.maps.Marker({
                icon: image,
                title: place.name,
                position: place.geometry.location
            });
            //this request object is used later when retrieving details about a place
            var request = {
                reference: place.reference
            };

            //This listener is for when you click on a place marker
            //An Information Window will pop up with more place details
            google.maps.event.addListener(marker, 'click', function () {
                service.getDetails(request, function (place, status) {
                    console.log("Place get Details");
                    if (status == google.maps.places.PlacesServiceStatus.OK) {
                        //information window content string
                        var contentString = '<div id="info-content">' +
                            '<table>' +
                            '<tr id="iw-url-row" class="iw_table_row">' +
                            '<td id="iw-icon" class="iw_table_icon">' + '<img class="hotelIcon" ' +
                            'src="' + place.icon + '"/>' + '</td>' +
                            '<td id="iw-url">' + '<b><a href="' + place.url +
                            '">' + place.name + '</a></b>' + '</td>' +
                            '</tr>' +
                            '<tr id="iw-address-row" class="iw_table_row">' +
                            '<td class="iw_attribute_name">Address:</td>' +
                            '<td id="iw-address">' + place.vicinity + '</td>' +
                            '</tr>';

                        // if a phone number exists it will be added to the info window
                        if (place.formatted_phone_number) {
                            contentString += '<tr id="iw-phone-row" class="iw_table_row">' +
                                '<td class="iw_attribute_name">Telephone:</td>' +
                                '<td id="iw-phone">' + place.formatted_phone_number + '</td>' + '</tr>';

                        }

                        // Assign a five-star rating to the hotel, using a black star ('&#10029;')
                        // to indicate the rating the hotel has earned, and a white star ('&#10025;')
                        // for the rating points not achieved.
                        if (place.rating) {
                            var ratingHtml = '';
                            for (var i = 0; i < 5; i++) {
                                if (place.rating < (i + 0.5)) {
                                    ratingHtml += '&#10025;';
                                } else {
                                    ratingHtml += '&#10029;';
                                }


                            }
                            contentString +=
                                '<tr id="iw-rating-row" class="iw_table_row">' +
                                '<td class="iw_attribute_name">Rating:</td>' +
                                '<td id="iw-rating">' + ratingHtml + '</td>' +
                                '</tr>';

                        }


                        var photos = place.photos;
                        //if there are photos for the place, then in the info window the first photo will be displayed
                        if (photos) {

                            var image = photos[0].getUrl({
                                'maxWidth': 100,
                                'maxHeight': 100
                            });
                            console.log("This place has a picture");
                            contentString += '<tr id="iw-picture-row" class="iw_table_row">' +
                                '<td class="iw_attribute_name">Picture:</td>' +
                                '<td id="iw-picture-column"><img  id="iw-picture" src="' + image + '"></td>' +
                                '</tr>';
                        }

                        contentString += '</table></div>';
                        console.log(contentString);
                        infowindow.setContent(contentString);
                        infowindow.open(map, marker);
                    } else {
                        contentString = "<h5>No Result, status=" + status + "</h5>";
                        infowindow.setContent(contentString);
                        infowindow.open(map, marker);
                    }
                });
            });

            //I am adding the marker to my MarkerClusterer object which manages drawing all of the markers
            mc.addMarker(marker, 3);

            // extend the bounds
            bounds.extend(place.geometry.location);
        }

        map.fitBounds(bounds);
    });
    //Listener for when the bounds of the map changes
    google.maps.event.addListener(map, 'bounds_changed', function () {
        var bounds = map.getBounds();
        searchBox.setBounds(bounds);
    });

    var button = document.getElementById('search_btn');

    //Button Listener - triggers loading of place markers through the keydown event
    button.onclick = function () {

        google.maps.event.trigger(input, 'focus')
        google.maps.event.trigger(input, 'keydown', {
            keyCode: 13
        });
    }
    // Overlay my custom controls onto the google maps canvas
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(button);

    //Upon clicking the map the infoWindow closes
    google.maps.event.addListener(map, 'click', function () {
        console.log("Clicked map");
        infowindow.close();
    });
}


google.maps.event.addDomListener(window, 'load', initialize);
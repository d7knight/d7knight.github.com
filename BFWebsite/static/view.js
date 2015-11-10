var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var geocoder;
var map;
var mc;
var mgr;
var start;
var end;
var bestIndex;
var stations;
var stationCount;
var placePrefercences = [];
var service;
var kitchener = new google.maps.LatLng(43.4, -80.4);
var ua = navigator.userAgent.toLowerCase();
var isAndroid = ua.indexOf("android") > -1;
var hostnameRegexp = new RegExp('^https?://.+?/');
var mode = "planRoute";
var plottedStations = new Array;
var plottedPlaces = new Array;
var stationMarkers= new Array;

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

function initialize() {

    console.log("Cache test 123456");
    addSpinner('Loading Map');
    geocoder = new google.maps.Geocoder();
    var mapOptions = {
        center: kitchener,
        zoom: 12,
        panControl: false,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        overviewMapControl: false,
        styles: myStyles
    };
    if (!isAndroid) {
        var extraOptions =
        {
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.LARGE,
                position: google.maps.ControlPosition.RIGHT_TOP
            }

        };
        mapOptions = $.extend(mapOptions, extraOptions);
    }
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    google.maps.event.addDomListener(document.getElementById('search_btn'), 'click', calcRoute);
    var start = /** @type {HTMLInputElement} */(
        document.getElementById('start'));
    var end = /** @type {HTMLInputElement} */(
        document.getElementById('end'));
    var search_btn = /** @type {HTMLInputElement} */(
        document.getElementById('search_btn'));
    var profile_btn = /** @type {HTMLInputElement} */(
        document.getElementById('profile_btn'));
    var gps_btn = /** @type {HTMLInputElement} */(
        document.getElementById('gps_btn'));

    profile_btn.addEventListener('click', function () {
        console.log('Profile clicked');

        if (isAndroid) {
            console.log("Android Mode");
            Android.switchToProfile();
        }
        else {
            console.log("Browser Mode");
            alert("This feature is only available in Android");
        }
    });

    gps_btn.addEventListener('click', function () {
        console.log('Profile clicked');
        if (isAndroid) {
            console.log("Android Mode");

            Android.requestCurLocation();
        }
        else {
            console.log("Browser Mode");
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    sendCurLocation(position.coords.latitude,
                        position.coords.longitude);

                }, function () {
                    console.log("no geolocation found");
                });
            } else {
                console.log("browser doesn't support geolocation");
            }
        }
    });


    map.controls[google.maps.ControlPosition.TOP_LEFT].push(start);
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(end);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(search_btn);


    var start_autocomplete = new google.maps.places.Autocomplete(start);
    var end_autocomplete = new google.maps.places.Autocomplete(end);
    start_autocomplete.bindTo('bounds', map);
    end_autocomplete.bindTo('bounds', map);

    directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
    directionsDisplay.setMap(map);
    mc = new MarkerClusterer(map);
    mgr=new MarkerManager(map);

    service = new google.maps.places.PlacesService(map);


    google.maps.event.addListenerOnce(map, "idle", function () {
        console.log("Finished Loading map removing spinner requesting gps data");
        removeSpinner();
        if (isAndroid) {
            console.log("Android Mode");
            Android.requestCurLocation();
        }
        else {
            console.log("Browser Mode");
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    var json = "{\"price\":0, \"open\":false, \"fuel_type\":\"regular\", \"places\":[\"airport\",\"mall\",\"food\",\"restaurant\"]}";
                    window.setInterval(sendPlacePreferences(json), 1000);
                    window.setInterval(sendMode("getGasNow"), 2000);
                    window.setInterval(sendCurLocation(position.coords.latitude,
                        position.coords.longitude), 3000);


                }, function () {
                    console.log("no geolocation found");
                });
            } else {
                console.log("browser doesn't support geolocation");
            }
        }
    });
    google.maps.event.addListener(map, 'click', function () {
        console.log("Clicked map");
        infowindow.close();
    });


}
function sendMode(androidMode) {
    console.log("send mode called mode is " + androidMode);

    mode = androidMode;


}
function calcRoute() {
    console.log("calculateRoute called");

    plottedPlaces=new Array;
    plottedStations=new Array;

    var start_address = document.getElementById('start').value;
    var end_address = document.getElementById('end').value;
    if (start_address == "" || end_address == "")return;
    addSpinner('Calculating Route');
    geocodeLocation(start_address, startAddressResolved);


}
function startAddressResolved() {
    if (!start)return;
    console.log("startAddressResolved called " + start.lat() + " " + start.lng());
    console.log("startAddressResolved test called mode is " + mode);
    if (mode == "getGasNow") {
        console.log("get gas now, addressesResolved called " + start.lat() + " " + start.lng());
        addSpinner("Retrieving Station Data");
        if (isAndroid)Android.findBestStation(start.lat(), start.lng());
        else {
            console.log("Browser Mode");
            var json = "{\"error\":false,\"result_set_size\":1,\"result\":[{\"id\":\"5109\",\"name\":\"Esso\",\"address\":\"593 Victoria St N Edna St\",\"lat\":\"43.458832\",\"lon\":\"-80.473434\",\"phone\":\"519-741-0424\",\"area\":\"Kitchener, ON N2H 5E9\",\"created_at\":\"2015-06-06 19:14:54\",\"updated_at\":null,\"gs_id\":\"5109\",\"grade\":\"Regular\",\"price\":\"107.9\",\"last_price\":null,\"price_updated\":\"1h\",\"distance\":\"0.4423678997087153\"}]}";

            window.setInterval(sendStationResult(json, 0), 3000);
            // sendStationResult(json, 0);

        }
    }
    else if (mode == "planRoute") {
        console.log("Initiated from Android Gps Location doing nothing more");

        console.log("Not initiated from Android Gps Location");
        var end_address = document.getElementById('end').value;
        console.log("Calculating End Address");
        geocodeLocation(end_address, drawRouteWithMarkers);


    }
    //Temp marker testing
    //var json ="{\"error\":false,\"result_set_size\":1,\"result\":[{\"id\":\"5109\",\"name\":\"Esso\",\"address\":\"593 Victoria St N Edna St\",\"lat\":\"43.458832\",\"lon\":\"-80.473434\",\"phone\":\"519-741-0424\",\"area\":\"Kitchener, ON N2H 5E9\",\"created_at\":\"2015-06-06 19:14:54\",\"updated_at\":null,\"gs_id\":\"5109\",\"grade\":\"Regular\",\"price\":\"107.9\",\"last_price\":null,\"price_updated\":\"1h\",\"distance\":\"0.4423678997087153\"}]}";
    //sendStationResult(json, 0);


}
function geocodeLocation(location, callback) {
    console.log("geocode location called for location:" + location);

    var end_address = document.getElementById('end').value;
    var start_address = document.getElementById('start').value;

    geocoder.geocode({'address': location}, function (results, status) {

        if (status == google.maps.GeocoderStatus.OK) {


            console.log("geocode location success");
            if (location == start_address) {
                start = new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng());
            }
            else if (location == end_address) {
                end = new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng());
            }
            callback();


        } else {
            console.log("geocode location failed");
            alert('Geocoder failed due to: ' + status);


        }

    });


}
function reverseGeocode(location, callback) {

    geocoder.geocode({'latLng': location}, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            if (results[1]) {

                callback(results[1]['formatted_address']);

            } else {
                alert('No results found');
            }
        } else {
            alert('Geocoder failed due to: ' + status);
        }
    });
}


function drawRouteWithMarkers() {
    console.log("Draw Route With markers called");
    if (!start)return;
    if (!end)return;
    mc.clearMarkers();


    var bounds = new google.maps.LatLngBounds();
    bounds.extend(start);
    bounds.extend(end);
    map.fitBounds(bounds);


    var request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING
    };
    directionsService.route(request, function (response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsDisplay.setDirections(response);
            directionsDisplay.setMap(map);
            if (mode == "getGasNow") {


                for (var i = 0; i < stationCount; i++) {

                    mgr.addMarker(getStationMarker(stations[i]),0);


                }


                var marker = new google.maps.Marker({
                    position: start

                });
                var contentString = '<div class="start_marker_info">' +
                    '<p class="address"> Your Location: ' + document.getElementById('start').value + '</p>' +
                    '</div>';
                marker.infoWindow = infowindow;

                google.maps.event.addListener(marker, 'click', function () {
                    console.log("Opened start marker info window");
                    infowindow.setContent('<div class="phoneytext">' + contentString + '<div>');
                    marker.infoWindow.open(map, marker);
                });

                mgr.addMarker(marker,0);
                mgr.refresh();

                var myRoute = response.routes[0].legs[0];
                for (var i = 0; i < myRoute.steps.length; i++) {

                    var step = myRoute.steps[i];


                    var step_start = step.start_location;
                    findAndPlotPlaces(step_start);
                    var lat = step_start.lat();
                    var lon = step_start.lng();
                    //TODO:Plan Route
                    /*
                     console.log("For loop At way point " +lat + " " +lon);



                     var station={};
                     station['name']="Can Tire Gas Bar";
                     station['address']="174 strange st";
                     station['phone']="911";
                     station['area']="toronto area";
                     station['brand']="Canadian Tire";
                     station['price']="99";
                     station['price_updated']="1m";
                     station['grade']="Regular";
                     station['lat']=lat;
                     station['lon']=lon;

                     mc.addMarker(getStationMarker(station), 1);
                     */


                }
            }
            else if (mode == "planRoute") {
                addSpinner('Retrieving Station Data');
                var startMarker = new google.maps.Marker({
                    position: start

                });

                startMarker.infoWindow = infowindow;

                google.maps.event.addListener(startMarker, 'click', function () {
                    var contentString = '<div class="start_marker_info">' +
                        '<p class="address"> Your Location: ' + document.getElementById('start').value + '</p>' +
                        '</div>';
                    console.log("Opened start marker info window");
                    infowindow.setContent('<div class="phoneytext">' + contentString + '<div>');
                    startMarker.infoWindow.open(map, startMarker);
                });


                var endMarker = new google.maps.Marker({
                    position: end

                });




                endMarker.infoWindow = infowindow;

                google.maps.event.addListener(endMarker, 'click', function () {
                    var contentString = '<div class="end_marker_info">' +
                        '<p class="address"> Your Destination: ' + document.getElementById('end').value + '</p>' +
                        '</div>';
                    console.log("Opened end marker info window");
                    infowindow.setContent('<div class="phoneytext">' + contentString + '<div>');
                    endMarker.infoWindow.open(map, endMarker);
                });

                mgr.addMarker(startMarker,0);
                mgr.addMarker(endMarker,0);

                mgr.refresh();
                var myRoute = response.routes[0].legs[0];
                for (var i = 0; i < myRoute.steps.length; i++) {

                    var step = myRoute.steps[i];

                    var step_start = step.start_location;
                    findAndPlotPlaces(step_start);
                    var lat = step_start.lat();
                    var lon = step_start.lng();
                    if (isAndroid) {
                        Android.findBestStation(lat, lon);
                        console.log("Atempting to find best station for leg " + i);
                    }
                    else{

                    }
                    //TODO:Plan Route
                    /*
                     console.log("For loop At way point " +lat + " " +lon);



                     var station={};
                     station['name']="Can Tire Gas Bar";
                     station['address']="174 strange st";
                     station['phone']="911";
                     station['area']="toronto area";
                     station['brand']="Canadian Tire";
                     station['price']="99";
                     station['price_updated']="1m";
                     station['grade']="Regular";
                     station['lat']=lat;
                     station['lon']=lon;

                     mc.addMarker(getStationMarker(station), 1);
                     */


                }

            }

            removeSpinner();

        } else {
            alert("Directions Request from " + start.toUrlValue(6) + " to " + end.toUrlValue(6) + " failed: " + status);
        }
    });


}


function getStationMarker(station) {

    var str = "";
    $.each(station, function (key, data) {
        str += key + ' -> ' + data;
        str += " , "
    });
    console.log("get station marker called with station: " + str);
    var options = jQuery.extend({
        scale: 1,
        includeIcon: true,
        includeStar: false,
        inDirections: false,
        includeArrow: true,
        fillColor: "0099CC",
        textColor: "FFFFFF",
        zIndex: 0

    });
    var scale = options.scale;
    var point = new google.maps.LatLng(station.lat, station.lon);
    var arrowImg;
    if (station.last_price > station.price) {
        arrowImg = '<img class="arrowImg" src="/static/images/green_arrow.jpg">';
    } else if (station.last_price < station.price) {
        arrowImg = '<img class="arrowImg" src="/static/images/red_arrow.jpg">';
    } else {
        arrowImg = '<img class="arrowImg" src="/static/images/equals.png">';
    }

    var contentString = '<div class="gas_price_info">' +
        '<div class="gas_price">' +
        '<p class="price">$' + Math.round(station.price * 10) / 1000 + arrowImg + '</p>' +
        '<p class="grade">' + station.grade + '</p>' +
        '</div>' +
        '<div class="station">' +
        '<p class="station_name">' + station.name + '</p>' +
        '<p>' + station.address + '</p>' +
        '<p>' + station.area + '</p>' +
        '<p class="phone">' + station.phone + '</p>' +
        '<p class="action-links"></p>' +
        '</div>' +
        '</div>';


    var MARKER_CONSTANTS = {
        bubbleWithIconAndText: {
            marker: {
                width: 89,
                urlBase: "http://chart.apis.google.com/chart?chst=d_bubble_icon_text_small&chld="
            }
        }
    };
    var constants = MARKER_CONSTANTS.bubbleWithIconAndText;

    var markerSettings = constants.marker;
    var markerImageUrl = markerSettings.urlBase;
    if (options.includeIcon) {
        markerImageUrl += "petrol|";
    }
    markerImageUrl += "bb|$" + Math.round(station.price * 10) / 1000;
    markerImageUrl += "|" + options.fillColor;
    markerImageUrl += "|" + options.textColor;

    var image = new google.maps.MarkerImage(
        markerImageUrl,
        null, // take the default //new google.maps.Size(markerSettings.width, 42), // size
        new google.maps.Point(0, 0),  // origin
        new google.maps.Point(0, 42 * scale), // anchor
        new google.maps.Size(markerSettings.width * scale, 42 * scale) // scaledSize
    );


    console.log("Marker Image Url " + markerImageUrl);

    var shape = {
        coord: [0, 42 * scale,        // tail point
            12 * scale, 26 * scale,  // upper hinge of lower left tail
            12 * scale, 0,         // upper left of marker
            markerSettings.width * scale, 0,         // upper right of marker
            markerSettings.width * scale, 26 * scale,  // lower right of marker
            20 * scale, 26 * scale], // lower hinge of lower left tail
        type: 'poly'
    };

    var marker = new google.maps.Marker({
        position: point,
        icon: image,
        shape: shape,
        zIndex: options.zIndex
    });

    marker.infoWindow = infowindow;

    google.maps.event.addListener(marker, 'click', function () {
        console.log("Opened marker info window");
        infowindow.setContent('<div class="phoneytext">' + contentString + '<div>');
        marker.infoWindow.open(map, marker);
    });


    return marker;

}

function contains(array, element){
    for (i = 0; i < array.length; i++) {
     if(deepCompare(array[i],element)){
         return true;
     }
    }
    return false;
}

function safeAddPlace(marker) {

    var min = .999999;
    var max = 1.000001;
    var latlng = marker.position;
    ///get array of markers currently in cluster
    var allMarkers = mc.getMarkers();

    //final position for marker, could be updated if another marker already exists in same position
    var finalLatLng = latlng;

    //check to see if any of the existing markers match the latlng of the new marker
    if (allMarkers.length != 0) {
        for (i = 0; i < allMarkers.length; i++) {
            var existingMarker = allMarkers[i];


            var pos = existingMarker.getPosition();



            //if a marker already exists in the same position as this marker
            if (latlng.equals(pos)) {

                //update the position of the coincident marker by applying a small multipler to its coordinates
                var newLat = latlng.lat() * (Math.random() * (max - min) + min);
                var newLng = latlng.lng() * (Math.random() * (max - min) + min);
                marker.position = new google.maps.LatLng(newLat, newLng);


            }
        }
    }
    mc.addMarker(marker, 3);
}


function addSpinner(message) {
    jQuery.blockUI({
        message: '<p id="loading"><img src="/static/images/loading.gif" /> ' + message + '</p>',
        css: {left: '10%', width: '80%', border: '3px solid #96B9D9'}
    });
}

function removeSpinner() {
    jQuery.unblockUI();
}

//send station results is actually receiving them here but sending them on the android side of our app

function sendStationResult(json, bestStationIndex) {
    console.log("send station result called");
    console.log("json" + json + "bestStationIndex" + bestStationIndex);
    var results = JSON && JSON.parse(json) || $.parseJSON(json);
    if (results['error']) {
        console.log("Received error from json results " + results['error_msg']);
        return;
    }
    if (mode == "getGasNow") {
        console.log("Received results data from android");
        stations = results['result'];
        stationCount = results['result_set_size'];
        bestIndex = bestStationIndex;

        end = new google.maps.LatLng(stations[bestIndex]['lat'], stations[bestIndex]['lon']);
        document.getElementById('end').setAttribute('value', stations[bestIndex]['address']);
        removeSpinner();
        drawRouteWithMarkers();
    }
    else if (mode == "planRoute") {
        bestIndex = bestStationIndex;
        var allstations = results['result'];
        var bestStation = allstations[bestIndex];

        if(contains(plottedStations,bestStation)){
            console.log(" already plotted station "+ bestStation.name+" "+bestStation.address);
            return;
        }
        plottedStations.push(bestStation);
        mgr.addMarker(getStationMarker(bestStation),0);
        mgr.refresh();


    }


}

function sendCurLocation(lat, lon) {
    console.log("send current location called");

    start = new google.maps.LatLng(lat, lon);
    reverseGeocode(start, function (address) {
        document.getElementById('start').setAttribute('value', address);
    });

    androidGpsLoc = true;
    if (mode == "getGasNow") {
        console.log("Mode is get gas now");
        startAddressResolved();
    }


}
function sendPlacePreferences(json) {

    console.log("send place preferences called");

    console.log("json" + json );
     placePrefercences= JSON && JSON.parse(json) || $.parseJSON(json);



}
function findAndPlotPlaces(location) {
    var request = {
        location: location,
        radius: 500,
        types:  placePrefercences.places,
        openNow: placePrefercences.open,
        minPriceLevel:placePrefercences.price
    };

    console.log("Making Request to google places API for "+ JSON.stringify(request));

    service.nearbySearch(request, function (results, status, pagination) {
        if (status != google.maps.places.PlacesServiceStatus.OK) {
            return;
        } else {
            createPlaceMarkers(results);


        }
    });
}
function deepCompare() {
    var i, l, leftChain, rightChain;

    function compare2Objects(x, y) {
        var p;

        // remember that NaN === NaN returns false
        // and isNaN(undefined) returns true
        if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
            return true;
        }

        // Compare primitives and functions.
        // Check if both arguments link to the same object.
        // Especially useful on step when comparing prototypes
        if (x === y) {
            return true;
        }

        // Works in case when functions are created in constructor.
        // Comparing dates is a common scenario. Another built-ins?
        // We can even handle functions passed across iframes
        if ((typeof x === 'function' && typeof y === 'function') ||
            (x instanceof Date && y instanceof Date) ||
            (x instanceof RegExp && y instanceof RegExp) ||
            (x instanceof String && y instanceof String) ||
            (x instanceof Number && y instanceof Number)) {
            return x.toString() === y.toString();
        }

        // At last checking prototypes as good a we can
        if (!(x instanceof Object && y instanceof Object)) {
            return false;
        }

        if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
            return false;
        }

        if (x.constructor !== y.constructor) {
            return false;
        }

        if (x.prototype !== y.prototype) {
            return false;
        }

        // Check for infinitive linking loops
        if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
            return false;
        }

        // Quick checking of one object beeing a subset of another.
        // todo: cache the structure of arguments[0] for performance
        for (p in y) {
            if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                return false;
            }
            else if (typeof y[p] !== typeof x[p]) {
                return false;
            }
        }

        for (p in x) {
            if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                return false;
            }
            else if (typeof y[p] !== typeof x[p]) {
                return false;
            }

            switch (typeof (x[p])) {
                case 'object':
                case 'function':

                    leftChain.push(x);
                    rightChain.push(y);

                    if (!compare2Objects(x[p], y[p])) {
                        return false;
                    }

                    leftChain.pop();
                    rightChain.pop();
                    break;

                default:
                    if (x[p] !== y[p]) {
                        return false;
                    }
                    break;
            }
        }

        return true;
    }

    if (arguments.length < 1) {
        return true; //Die silently? Don't know how to handle such case, please help...
        // throw "Need two or more arguments to compare";
    }

    for (i = 1, l = arguments.length; i < l; i++) {

        leftChain = []; //Todo: this can be cached
        rightChain = [];

        if (!compare2Objects(arguments[0], arguments[i])) {
            return false;
        }
    }

    return true;
}
function createPlaceMarkers(places) {

    for (var i = 0, place; place = places[i]; i++) {
        if(contains(plottedPlaces,place))continue;
        plottedPlaces.push(place);
        var marker = createPlaceMarker(place);
        safeAddPlace(marker);


    }

}
function createPlaceMarker(place) {
    var placeLoc = place.geometry.location;
    if (place.icon) {
        var image = new google.maps.MarkerImage(
            place.icon, new google.maps.Size(71, 71),
            new google.maps.Point(0, 0), new google.maps.Point(17, 34),
            new google.maps.Size(25, 25));
    } else var image = null;

    var marker = new google.maps.Marker({

        icon: image,
        position: place.geometry.location
    });
    var request = {
        reference: place.reference
    };

    google.maps.event.addListener(marker, 'click', function () {
        service.getDetails(request, function (place, status) {
            console.log("Place get Details");
            if (status == google.maps.places.PlacesServiceStatus.OK) {
                document.getElementById('iw-icon').innerHTML = '<img class="hotelIcon" ' +
                    'src="' + place.icon + '"/>';
                document.getElementById('iw-url').innerHTML = '<b><a href="' + place.url +
                    '">' + place.name + '</a></b>';
                document.getElementById('iw-address').textContent = place.vicinity;

                if (place.formatted_phone_number) {
                    document.getElementById('iw-phone-row').style.display = '';
                    document.getElementById('iw-phone').textContent =
                        place.formatted_phone_number;
                } else {
                    document.getElementById('iw-phone-row').style.display = 'none';
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
                        document.getElementById('iw-rating-row').style.display = '';
                        document.getElementById('iw-rating').innerHTML = ratingHtml;
                    }
                } else {
                    document.getElementById('iw-rating-row').style.display = 'none';
                }

                // The regexp isolates the first part of the URL (domain plus subdomain)
                // to give a short URL for displaying in the info window.
                if (place.website) {
                    var fullUrl = place.website;
                    var website = hostnameRegexp.exec(place.website);
                    if (website == null) {
                        website = 'http://' + place.website + '/';
                        fullUrl = website;
                    }
                    document.getElementById('iw-website-row').style.display = '';
                    document.getElementById('iw-website').textContent = website;
                } else {
                    document.getElementById('iw-website-row').style.display = 'none';
                }
                var photos = place.photos;

                if (photos) {

                    var image = photos[0].getUrl({'maxWidth': 100, 'maxHeight': 100});
                    console.log("This place has a picture");

                    document.getElementById('iw-picture').setAttribute("src", image);
                }
                else {
                    document.getElementById('iw-picture-row').style.display = 'none';
                }
                var open, closed;

                try {
                    var time = place.opening_hours.periods[new Date().getDay()].open.time;
                    var hours = (time / 100).toFixed(0);
                    var min = time.substr(-2);
                    //it is pm if hours from 12 onwards
                    var suffix = (hours >= 12) ? 'pm' : 'am';

                    //only -12 from hours if it is greater than 12 (if not back at mid night)
                    hours = (hours > 12) ? hours - 12 : hours;

                    //if 00 then it is 12 am
                    hours = (hours == '00') ? 12 : hours;
                    open = hours + ":" + min + suffix;

                }
                catch (e) {
                    document.getElementById('iw-hours-row').style.display = 'none';
                }
                try {
                    var time = place.opening_hours.periods[new Date().getDay()].close.time;

                    var hours = (time / 100).toFixed(0);
                    var min = time.substr(-2);
                    //it is pm if hours from 12 onwards
                    var suffix = (hours >= 12) ? 'pm' : 'am';

                    //only -12 from hours if it is greater than 12 (if not back at mid night)
                    hours = (hours > 12) ? hours - 12 : hours;

                    //if 00 then it is 12 am
                    hours = (hours == '00') ? 12 : hours;
                    closed = hours + ":" + min + suffix;
                }
                catch (e) {
                    if (!open) document.getElementById('iw-hours-row').style.display = 'none';
                }
                if (open && !closed)document.getElementById('iw-hours').textContent = "Opened from " + open + " today";
                if (open && closed)document.getElementById('iw-hours').textContent = "Open from " + open + " to " + closed + " today";

                if (photos) {

                    var image = photos[0].getUrl({'maxWidth': 100, 'maxHeight': 100});
                    console.log("This place has a picture");

                    document.getElementById('iw-picture').setAttribute("src", image);

                }
                else {
                    document.getElementById('iw-picture-row').style.display = 'none';
                }


                infowindow.setContent(document.getElementById('info-content'));
                infowindow.open(map, marker);
            } else {
                var contentStr = "<h5>No Result, status=" + status + "</h5>";
                infowindow.setContent(contentStr);
                infowindow.open(map, marker);
            }
        });
    });
    return marker;
}

var infowindow = new InfoBubble(
    {
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


google.maps.event.addDomListener(window, 'load', initialize);




'use strict';

/* App Module */

var app = angular.module('app', [
    'ngCookies',
    'app.controllers',
    'app.directives'
]);

app.config(['$locationProvider', function ($locationProvider) {
    $locationProvider.html5Mode(true);
}]);

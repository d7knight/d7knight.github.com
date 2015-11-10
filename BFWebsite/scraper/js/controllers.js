'use strict';

/* Controllers */

var controllers = angular.module('app.controllers', []);

controllers.controller('Controller', ['$scope', '$http', '$cookies', '$timeout', function($scope, $http, $cookies, $timeout) {
    $scope.zip = undefined;
    $scope.stations = [];
    $scope.stationIds = $cookies['ids'];
    $scope.stationId = undefined;
    $scope.loading = true;
    $scope.loadingZipCode = false;
    $scope.loadingSingleStation = false;
    
    $scope.getStationsForZip = function(zip) {
        $timeout(function(){
            $http.get('controller.php', {
                params: {
                    action: 'zip',
                    ids: zip
                }
            }).success(function (data, status, headers, config) {
                $scope.stationIds += ',' + data.join();
                saveCookie();
                $scope.loadingZipCode = true;
                $scope.updateTable();
            });
        });
    };

    $scope.updateTable = function() {
        $http.get('controller.php', {
            params: {
                action: 'station',
                ids: $scope.stationIds
            }
        }).success(function (data, status, headers, config) {
            $scope.stations = data;
            $scope.loading = false;
            $scope.loadingZipCode = false;
            $scope.loadingSingleStation = false;
        });
    };

    $scope.removeStation = function(id) {
        $scope.stationIds = removeValue($scope.stationIds, id, ',');
        saveCookie();
    };

    $scope.addStation = function(id) {
        var numbers = $scope.stationIds.split(',');
        if (numbers.indexOf(id) == -1) {
            numbers.push(id);
        }
        $scope.stationIds = numbers.join(',');
        saveCookie();
        $scope.loadingSingleStation = true;
        $scope.updateTable();
    };

    var saveCookie = function() {
        $cookies['ids'] = $scope.stationIds;
    };

    var removeValue = function(list, value, separator) {
        separator = separator || ",";
        var values = list.split(separator);
        for(var i = 0 ; i < values.length ; i++) {
            if(values[i] == value) {
                values.splice(i, 1);
                return values.join(separator);
            }
        }
        return list;
    };
}]);

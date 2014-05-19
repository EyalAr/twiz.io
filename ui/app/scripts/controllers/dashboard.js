'use strict';

angular
    .module('twizio')
    .controller('dashboardCtrl', function($scope, $cookies) {

        $scope.sessionKey = $cookies.twizioSessionKey;

    });
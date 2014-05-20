'use strict';

angular
    .module('twizio')
    .controller('dashboardCtrl', function($scope, $cookies) {

        $scope.logout = logout;

        function logout() {
            window.location = '/auth/logout';
        }

    });
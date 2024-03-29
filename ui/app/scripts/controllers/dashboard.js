'use strict';

angular
    .module('twizio')
    .controller('dashboardCtrl', function($scope, $http) {

        $http.get('/user/get').success(function(data) {
            $scope.content = JSON.stringify(data,0,4);
        });

        $scope.logout = logout;

        function logout() {
            window.location = '/auth/logout';
        }

    });
'use strict';

angular
    .module('twizio')
    .controller('dashboardCtrl', function($scope, $http) {

        $http.get('/user/get').success(function(data) {
            console.log(data);
        });

        $scope.logout = logout;

        function logout() {
            window.location = '/auth/logout';
        }

    });
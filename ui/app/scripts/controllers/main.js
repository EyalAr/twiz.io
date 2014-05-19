'use strict';

angular
    .module('twizio')
    .controller('mainCtrl', function($scope, $http, $cookies, $location) {

        $scope.pleaseWait = true;
        $scope.loggedIn = false;
        $scope.loginWithGithub = loginWithGithub;

        $http.get('/auth/isLoggedIn', {
            data: {
                session: $cookies.twizioSessionKey
            }
        }).success(function(data) {
            console.log(data);
            if (data.success && data.loggedIn) {
                $location.path('/dashboard');
            } else {
                $scope.pleaseWait = false;
            }
        });

        function loginWithGithub() {
            $http.post('/auth/login', {
                provider: 'github'
            }).success(function(data) {
                window.location = data.next;
            });
        }

    });
'use strict';

angular
    .module('twizio', [
        'ngRoute',
        'ngCookies',
        'ngAnimate',
        'ui.bootstrap'
    ])

.config(

    function($routeProvider) {

        $routeProvider
            .when('/', {
                templateUrl: 'views/main.html',
                controller: 'mainCtrl'
            })
            .when('/dashboard', {
                templateUrl: 'views/dashboard.html',
                controller: 'dashboardCtrl'
            })
            .otherwise({
                redirectTo: '/'
            });

    });
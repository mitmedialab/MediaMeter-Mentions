_.extend(App.Router.prototype.routes, {
    '': App.Controller.routeHome
    , '/': App.Controller.routeHome
    , 'demo': App.Controller.routeDemo
    , 'query/:keywords/:media/:start/:end': App.Controller.routeQuery
});

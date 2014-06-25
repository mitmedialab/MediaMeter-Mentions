_.extend(App.Controller, {
    
    // Override
    showResults: function (queryCollection) {
        // Create new results view
        App.debug("App.Controller.showResults")
        var resultView = this.vm.getView(
            App.MentionsResultListView,
            { collection: queryCollection },
            true
        );
        this.vm.showViews([
            this.queryListView
            , resultView
        ]);
        resultView.render();
        App.debug("done------------------------------------------------------------------------------------------------------------------------")
    },
    
    routeDemo: function () {
        if (!App.con.userModel.get('authenticated')) {
            App.con.router.navigate('login', true);
            return;
        }
        App.con.router.navigate('', true);
    },
    
    routeHome: function () {
        App.debug('Route: home');
        if (!App.con.userModel.get('authenticated')) {
            App.con.router.navigate('login', true);
            return;
        }
        // Defaults media
        App.con.mediaModel = new App.MediaModel();
        App.con.mediaSources.deferred.then(function () {
            App.debug('Adding default media');
            //var tagSet = App.con.mediaSources.get('tag_sets').get(5).cloneEmpty();
            //tagSet.get('tags').add(App.con.mediaSources.get('tag_sets').get(5).get('tags').get(8875027).clone());
            //App.con.mediaModel.get('tag_sets').add(tagSet);
            var tag = App.con.mediaSources.get('tags').get(8875027).clone();
            App.con.mediaModel.get('tags').add(tag);
        });
        // Default tags
        // Defaults dates
        var dayMs = 24 * 60 * 60 * 1000;
        var ts = new Date().getTime();
        var start = new Date(ts - 15*dayMs);
        var end = new Date(ts - 1*dayMs);
        var attributes = {
            start: start.getFullYear() + '-' + (start.getMonth()+1) + '-' + start.getDate()
            , end: end.getFullYear() + '-' + (end.getMonth()+1) + '-' + end.getDate()
            , mediaModel: App.con.mediaModel
            , keywords: 'boston'
        };
        var options = {
            mediaSources: App.con.mediaSources
            , parse: true
        };
        App.con.queryCollection.reset();
        App.con.queryModel = new App.QueryModel(attributes, options);
        App.con.queryCollection.add(App.con.queryModel);
        App.con.queryListView = App.con.vm.getView(
            App.QueryListView
            , {
                collection: App.con.queryCollection
                , mediaSources: App.con.mediaSources
            }
        );
        App.con.queryCollection.on('execute', App.con.onQuery, this);
        App.con.vm.showView(App.con.queryListView);
    },
    
    routeQuery: function (keywords, media, start, end) {
        App.debug('App.controller:mentions.routeQuery() ------------------------------------------------------------------------------------------------------------------------');
        if (!App.con.userModel.get('authenticated')) {
            App.con.router.navigate('login', true);
            return;
        }
        keywordList = $.parseJSON(keywords);
        startList = $.parseJSON(start);
        endList = $.parseJSON(end);
        if (!App.con.userModel.get('authenticated')) {
            App.con.navigate('login', true);
            return;
        }
        // Create query collection
        if (!App.con.queryCollection) {
            App.con.queryCollection = new App.QueryCollection();
        } else {
            App.con.queryCollection.reset();
        }
        // When sources are loaded, populate the media models from the url
        App.con.mediaSources.deferred.then(function() {
            // Add a media model for each query
            // TODO this should really happen in MediaCollection/MediaModel
            _.each($.parseJSON(media), function (d, i) {
                var mediaModel = new App.MediaModel();
                var queryModel = new App.QueryModel({
                    keywords: keywordList[i]
                    , mediaModel: mediaModel
                    , start: startList[i]
                    , end: endList[i]
                }, {
                    mediaSources: App.con.mediaSources
                    , parse: true
                });
                App.con.queryCollection.add(queryModel);
                var subset = App.con.mediaSources.subset(d);
                subset.get('sources').each(function (m) {
                    mediaModel.get('sources').add(m);
                });
                subset.get('tags').each(function(simpleTag){
                    mediaModel.get('tags').add(simpleTag);
                });
                subset.get('tag_sets').each(function (m) {
                    mediaModel.get('tag_sets').add(m);
                });
            });
            App.con.queryCollection.execute();
        });
        App.con.queryListView = App.con.vm.getView(
            App.QueryListView
            , {
                collection: App.con.queryCollection
                , mediaSources: App.con.mediaSources
            }
        );
        App.con.queryCollection.on('execute', App.con.onQuery, App.con);
        App.con.queryCollection.on('add', App.con.onQueryAdd, App.con);
        App.con.showResults(App.con.queryCollection);
    }
});

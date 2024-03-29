
/**
 * Base class for nested models, uses the scheme described here:
 * http://stackoverflow.com/questions/6535948/nested-models-in-backbone-js-how-to-approach
 */
App.NestedModel = Backbone.Model.extend({
    attributeModels: {},
    parse: function (response) {
        for (var key in this.attributeModels) {
            var subModel = this.attributeModels[key];
            var subData = response[key];
            response[key] = new subModel(subData, {parse: true})
            // Notify children that they have been updated
            response[key].trigger('parentSync');
        }
        App.debug(response);
        return response;
    }
})

App.UserModel = Backbone.Model.extend({
    
    id: 'user',
    urlRoot: '/api',
    defaults: {
        username: ''
        , anonymous: true
        , authenticated: false
        , error: ''
        , key: ''
    },
    
    initialize: function () {
        App.debug('App.UserModel.initialize()')
        _.bindAll(this, 'onSync');
        _.bindAll(this, 'onSignIn');
        _.bindAll(this, 'onSignInError');
        _.bindAll(this, 'onSignOut');
        _.bindAll(this, 'signIn');
        _.bindAll(this, 'signOut');
        this.on('sync', this.onSync);
        this.on('error', this.onSignInError);
        this.set('key', $.cookie('mediameter_user_key'));
        this.set('username', $.cookie('mediameter_user_username'));
    },
    
    onSync: function () {
        App.debug('App.UserModel.onSync()');
        if (this.get('authenticated')) {
            this.onSignIn();
        } else {
            this.onSignOut();
        }
    },
    
    onSignIn: function () {
        App.debug('App.UserModel.onSignIn()');
        $.cookie('mediameter_user_key', this.get('key'), App.config.cookieOpts);
        $.cookie('mediameter_user_username', this.get('username'), App.config.cookieOpts);
        this.trigger('signin');
    },
    
    onSignInError: function (model, response, options) {
        App.debug('Error signing in: ' + response.status);
        this.set('error', 'Invalid username/password');
        if (response.status == 401) {
            this.trigger('unauthorized', 'Invalid username/password');
        }
    },
    
    onSignOut: function () {
        App.debug('App.UserModel.onSignOut()');
        this.trigger('signout');
    },
    
    signIn: function (options) {
        App.debug('App.UserModel.signIn()')
        that = this;
        if (typeof(route) === 'undefined') {
            route = 'home';
        }
        if (typeof(options.username) !== 'undefined') {
            App.debug('Signing in with username/password');
            this.set('id', 'login');
            this.fetch({
              type: 'post',
              data: {'username': options.username, 'password': options.password},
              success: options.success,
              error: options.error
            });
        } else if (typeof(this.get('key')) !== 'undefined') {
            App.debug('Signing in with key');
            this.set('id', 'login');
            this.fetch({
              type: 'post',
              data: {'username': this.get('username'), 'key': this.get('key')},
              success: options.success,
              error: options.error
            });
        } else {
            if (options.error) {
                options.error();
            }
        }
    },
    
    signOut: function () {
        App.debug('App.UserModel.signOut()')
        $.removeCookie('mediameter_user_key', App.config.cookieOpts);
        $.removeCookie('mediameter_user_username', App.config.cookieOpts);
        this.set('id', 'logout');
        this.fetch({type: 'post'});
    }
})

App.MediaSourceModel = Backbone.Model.extend({
    urlRoot: '/api/media/sources',
    url: function () {
        return this.get('media_id');
    },
    idAttribute: 'media_id',
    initialize: function (attributes, options) {
        this.set('type', 'media source');
    }
});

App.MediaSourceCollection = Backbone.Collection.extend({
    model: App.MediaSourceModel,
    url: '/api/media/sources',
    initialize: function () {
        App.debug('App.MediaSourceCollection.initialize()');
        this.nameToSource = {}
        this.on('sync', this.onSync);
        this.on('parentSync', this.onSync);
        _.bindAll(this, 'onSync');
    },
    onSync: function () {
        App.debug('App.MediaSourceCollection.onSync()');
        this.nameToSource = App.makeMap(this, 'name');
    },
    getSuggestions: function () {
        App.debug('MediaSourceCollection.getSuggestions()');
        if (!this.suggest) {
            this.suggest = new Bloodhound({
                datumTokenizer: function (d) {
                    return Bloodhound.tokenizers.whitespace(d.name);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: this.toJSON()
            });
            this.suggest.initialize();
        }
        return this.suggest;
    }
});

App.TagModel = Backbone.Model.extend({
    url: '/api/tags/single',
    idAttribute: 'tags_id',
    initialize: function (options) {},
    clone: function () {
        var cloneModel = new App.TagModel();
        cloneModel.set('tags_id', this.get('tags_id'));
        cloneModel.set('tag_sets_id', this.get('tag_sets_id'));
        cloneModel.set('tag', this.get('tag'));
        cloneModel.set('label', this.get('label'));
        return cloneModel;
    },
    getLabel: function(){
        return (this.get('label')!=null) ? this.get('label') : this.get('tag');
    }
});

App.TagCollection = Backbone.Collection.extend({
    model: App.TagModel,
    initialize: function (options) {
    },
    getSuggestions: function () {
        App.debug('TagCollection.getSuggestions()');
        if (!this.suggest) {
            App.debug('Creating new suggestion engine');
            var suggest = new Bloodhound({
                datumTokenizer: function (d) {
                    return Bloodhound.tokenizers.whitespace(d.label);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: this.toJSON()
            });
            suggest.initialize();
            this.suggest = suggest;
        } else {
            App.debug('Reusing suggestion engine');
        }
        return this.suggest;
    },
    clone: function () {
        var cloneCollection = new App.TagCollection();
        this.each(function (m) {
            cloneCollection.add(m.clone());
        });
        return cloneCollection;
    }
});

App.SimpleTagModel = Backbone.Model.extend({
    initialize: function (options) {}

});

App.SimpleTagCollection = Backbone.Collection.extend({
    model: App.SimpleTagModel,
    initialize: function (options) {
        App.debug('App.SimpleTagCollection.initialize()');
    },
    getSuggestions: function () {
        App.debug('SimpleTagCollection.getSuggestions()');
        if (!this.suggest) {
            this.suggest = new Bloodhound({
                datumTokenizer: function (d) {
                    return Bloodhound.tokenizers.whitespace(d.name);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: this.toJSON()
            });
            this.suggest.initialize();
        }
        return this.suggest;
    },
    getByName: function (nameToFind){
        return this.where({ name: nameToFind })[0];
    },
    clone: function () {
        var cloneCollection = new App.SimpleTagCollection();
        this.each(function (m) {
            cloneCollection.add(m.clone());
        });
        return cloneCollection;
    }
});

App.TagSetModel = App.NestedModel.extend({
    url: '/api/tag_sets/single',
    idAttribute: 'tag_sets_id',
    attributeModels: {
        'tags': App.TagCollection
    },
    initialize: function (options) {
        if (!this.get('tags')) {
            // TODO this should be moved into defaults
            this.set('tags', new App.TagCollection());
        }
    },
    clone: function () {
        newModel = this.cloneEmpty();
        newModel.set('tags', this.get('tags').clone());
        return newModel;
    },
    cloneEmpty: function () {
        newModel = new App.TagSetModel();
        newModel.set('tag_sets_id', this.get('tag_sets_id'));
        newModel.set('name', this.get('name'));
        newModel.set('label', this.get('label'));
        return newModel;
    },
    getLabel: function(){
        return (this.get('label')!=null) ? this.get('label') : this.get('name');
    },
    queryParam: function () {
        qp = {
            tag_sets_id: this.get('tag_sets_id')
            , tags_id: this.get('tags').pluck('tags_id')
        }
        return qp;
    }
});

App.TagSetCollection = Backbone.Collection.extend({
    model: App.TagSetModel,
    initialize: function (options) {
        var that = this;
    },
    getSuggestions: function () {
        App.debug('TagSetCollection.getSuggestions()');
        if (!this.suggest) {
            this.suggest = new Bloodhound({
                datumTokenizer: function (d) {
                    return Bloodhound.tokenizers.whitespace(d.name);
                },
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: this.toJSON()
            });
            this.suggest.initialize();
        }
        return this.suggest;
    },
    queryParam: function () {
        return this.map(function (m) { return m.queryParam(); });
    },
    clone: function () {
        var cloneCollection = new App.TagSetCollection();
        this.each(function (m) {
            cloneCollection.add(m.clone());
        });
        return cloneCollection;
    }
})


/**
 * This handles specifying media individually and by set.
 */
App.MediaModel = App.NestedModel.extend({
    urlRoot: '/api/media',
    attributeModels: {
        sources: App.MediaSourceCollection
        , tag_sets: App.TagSetCollection
        , tags: App.SimpleTagCollection
    },
    initialize: function () {
        App.debug('App.MediaModel.initialize()');
        var that = this;
        this.set('sources', new App.MediaSourceCollection());
        this.set('tag_sets', new App.TagSetCollection());
        this.set('tags', new App.SimpleTagCollection());
        this.deferred = $.Deferred();
        this.on('sync', this.onSync, this);
        _.bindAll(this, 'onSync');
    },
    onSync: function() {
        App.debug("MediaModel.onSync");
        var that = this;
        App.debug(this);
        // turn the tag_sets info from the server into tags information
        this.get('tag_sets').each(function(tagSet){
            tagSet.get('tags').each(function(tag){
                that.get('tags').add(new App.SimpleTagModel({
                    'id': tag.get('tags_id'),
                    'tag_sets_id': tagSet.get('tag_sets_id'),
                    'tagName': tag.get('tag'),
                    'name': tagSet.getLabel()+" - "+tag.getLabel()
                }));
            });
        });
        this.deferred.resolve();
    },
    clone: function () {
        App.debug('App.MediaModel.clone()');
        var cloneModel = new App.MediaModel()
        this.get('sources').each(function (m) {
            cloneModel.get('sources').add(m);
        });
        cloneModel.set('tags', this.get('tags').clone());
        cloneModel.set('tag_sets', this.get('tag_sets').clone());
        cloneModel.deferred.resolve();
        return cloneModel;
    },
    subset: function (o) {
        // Map path to model
        // Return a copy of this media model containing a subset of the
        // sources and sets according to an object like:
        // {sources:[1],tags:[{'tag_sets_id:23', 'tags_id:[4,5]'}]}
        App.debug('App.MediaModel.subset()');
        var that = this;
        media = new App.MediaModel();
        // Copy the source/tag from this MediaModel to a new one
        _.each(o.tags, function (tagParam) {
            var set = that.get('tag_sets').get(tagParam.tag_sets_id);
            var newSet = set.cloneEmpty();
            media.get('tag_sets').add(newSet);
            _.each(tagParam.tags_id, function (id) {
                var cloneTag = set.get('tags').get(id).clone();
                newSet.get('tags').add(cloneTag);
            });
        });
        _.each(o.sets, function(id){
            var tag = that.get('tags').get({id:id});
            media.get('tags').add(tag);
        });
        _.each(o.sources, function (id) {
            var m = that.get('sources').get({id:id})
            media.get('sources').add(m);
        });
        return media;
    },
    // Map model to path
    queryParam: function () {
        var qp = {}
        var sources = this.get('sources');
        if (sources && sources.length > 0) {
            qp.sources = sources.pluck('media_id');
        }
        var sets = this.get('tags');
        if (sets && sets.length > 0) {
            qp.sets = sets.pluck('id');
        }
        return qp;
    }
})

/** 
 * Wrapper around one set of criteria for a search (keywords, dates, media sources + sets).
 * This also handles results.
 */
App.QueryModel = Backbone.Model.extend({
    initialize: function (attributes, options) {
        App.debug('App.QueryModel.initialize()');
        App.debug(attributes);
        App.debug(options);
        App.debug(this.get('mediaModel'));
        this.mediaSources = options.mediaSources
        var opts = {
            mediaSources: this.mediaSources,
            params: this.get('params')
        };
        this.ResultModel = options.ResultModel;
        if (typeof(this.ResultModel) == 'undefined') {
            this.ResultModel = App.ResultModel;
        }
        this.set('results', new this.ResultModel({}, opts));
    },
    parse: function (response, options) {
        response.params = new Backbone.Model({
            keywords: response.keywords
            , mediaModel: response.mediaModel
            , start: response.start
            , end: response.end
        });
        delete response.keywords;
        delete response.mediaModel;
        delete response.start;
        delete response.end;
        return response;
    },
    execute: function () {
        App.debug('App.QueryModel.execute()');
        this.get('results').fetch();
        this.trigger('model:execute', this);
    }
});

/**
 * Holds a set of queries, each specifying criteria that are part of the search.
 * This handles serialization.
 */
App.QueryCollection = Backbone.Collection.extend({
    model: App.QueryModel,
    initialize: function () {
        // Resource event aggregator
        this.resources = new ResourceListener();
        // Refine query event aggregator
        this.refine = _.extend({}, Backbone.Events);
        this.each(function (m) {
            this.onAdd(m, this);
        }, this);
        this.listenTo(this, 'add', this.onAdd);
        this.listenTo(this, 'remove', this.onRemove);
        this.listenTo(this.refine, 'mm:refine', this.onRefine);
    },
    onAdd: function (model, collection, options) {
        // When adding a QueryModel, listen to it's ResultModel
        this.resources.listen(model.get('results'));
        collection.updateNames();
        // Add the refine query event aggregator
        model.refine = this.refine;
    },
    onRemove: function (model, collection, options) {
        // Unlisten when we remove
        this.resources.unlisten(model.get('results'));
        collection.updateNames();
    },
    onRefine: function (options) {
        var q = []
        if (typeof(options.length) !== 'undefined') {
            q = options;
        } else {
            q.push(options);
        }
        _.each(q, function (options) {
            if (typeof(options.term) !== 'undefined') {
                if (typeof(options.query) !== 'undefined') {
                    var params = this.at(options.query).get('params');
                    params.set('keywords', options.term);
                } else if (typeof(options.queryCid) !== 'undefined') {
                    var params = this.get({cid:options.queryCid}).get('params');
                    params.set('keywords', options.term);
                }
            }
        }, this);
        this.execute();
    },
    execute: function () {
        App.debug('App.QueryCollection.execute()');
        // Execute each Query
        this.map(function (m) { m.execute(); });
        App.debug('Trigger App.QueryCollection:execute');
        this.trigger('execute', this);
    },
    keywords: function () {
        var allKeywords = this.map(function(m) { return m.get('params').get('keywords'); });
        return JSON.stringify(allKeywords);
    },
    start: function () {
        var allStart = this.map(function(m) { return m.get('params').get('start'); });
        return JSON.stringify(allStart);
    },
    end: function () {
        var allEnd = this.map(function(m) { return m.get('params').get('end'); });
        return JSON.stringify(allEnd);
    },
    media: function () {
        var allMedia = this.map(function (m) { return m.get('params').get('mediaModel').queryParam(); });
        return JSON.stringify(allMedia);
    },
    dashboardUrl: function () {
        if (this.length == 0) {
            return '';
        }
        path = [
            'query'
            , this.keywords()
            , this.media()
            , this.start()
            , this.end()
        ].join('/');
        return path.replace(' ', '');
    },
    dashboardDemoUrl: function () {
        return [
            'demo-query'
            , this.keywords()
            , this.media()
            , this.start()
            , this.end()
        ].join('/');
    },
    updateNames: function () {
        this.each(function (m, i) {
            if (i < App.config.queryNames.length) {
                m.set('name', App.config.queryNames[i]);
            }
        })
    }
})

App.SentenceModel = Backbone.Model.extend({
    initialize: function (attributes, options) {
    },
    date: function () {
        var dateString = this.get('publish_date');
        if (dateString.indexOf('T') >= 0) {
            dateString = dateString.substring(0, dateString.indexOf('T'));
        }
        var date;
        if(dateString.length==19){  // gotta parse this: "2014-07-12 18:32:05"
            date = new Date(
                dateString.substring(0,4), parseInt(dateString.substring(5,7))-1, dateString.substring(8,10),
                dateString.substring(11,13), dateString.substring(14,16), dateString.substring(17)
                );
        } else {
            date = new Date(dateString);    // fallback to something - will this even work?
        }
        
        return date.toLocaleDateString();
    },
    media: function () {
        return this.get('medium_name');
    }
});

App.SentenceCollection = Backbone.Collection.extend({
    resourceType: 'sentence',
    model: App.SentenceModel,
    initialize: function (models, options) {
        this.params = options.params;
        this.mediaSources = options.mediaSources;
        this.waitForLoad = $.Deferred();
        this.on('sync', function () { this.waitForLoad.resolve(); }, this);
    },
    url: function () {
        var url = '/api/sentences/docs/';
        url += encodeURIComponent(this.params.get('keywords'));
        url += '/' + encodeURIComponent(JSON.stringify(this.params.get('mediaModel').queryParam()));
        url += '/' + encodeURIComponent(this.params.get('start'));
        url += '/' + encodeURIComponent(this.params.get('end'));
        return url;
    },
    csvUrl: function () {
        var url = '/api/stories/docs/';
        url += encodeURIComponent(this.params.get('keywords'));
        url += '/' + encodeURIComponent(JSON.stringify(this.params.get('mediaModel').queryParam()));
        url += '/' + encodeURIComponent(this.params.get('start'));
        url += '/' + encodeURIComponent(this.params.get('end'));
        return url + encodeURIComponent('.csv');
    }
});

App.DemoSentenceCollection = App.SentenceCollection.extend({
    url: function () {
        var url = '/api/demo/sentences/docs/';
        url += encodeURIComponent(this.params.get('keywords'));
        return url;
    }
});

App.WordCountModel = Backbone.Model.extend({});
App.WordCountCollection = Backbone.Collection.extend({
    resourceType: 'wordcount',
    model: App.WordCountModel,
    initialize: function (models, options) {
        this.params = options.params;
    },
    url: function () {
        var url = '/api/wordcount/';
        url += encodeURIComponent(this.params.get('keywords'));
        url += '/' + encodeURIComponent(JSON.stringify(this.params.get('mediaModel').queryParam()));
        url += '/' + encodeURIComponent(this.params.get('start'));
        url += '/' + encodeURIComponent(this.params.get('end'));
        return url;
    },
    csvUrl: function(){
        return [ '/api', 'wordcount',
                 encodeURIComponent(this.params.get('keywords')),
                 encodeURIComponent(JSON.stringify(this.params.get('mediaModel').queryParam())),
                 encodeURIComponent(this.params.get('start')),
                 encodeURIComponent(this.params.get('end')),
                 'csv'
        ].join('/');
    }
});

App.DemoWordCountCollection = App.WordCountCollection.extend({
    url: function () {
        var url = '/api/demo/wordcount/';
        url += encodeURIComponent(this.params.get('keywords'));
        return url;
    },
    csvUrl: function(){
        return ['/api', 'demo', 'wordcount'
            , encodeURIComponent(this.params.get('keywords'))
            , 'csv'
        ].join('/')
    }
});

App.DateCountModel = Backbone.Model.extend({
    parse: function (result) {
        var ymd = result.date.split('-');
        d = new Date(Date.UTC(ymd[0], ymd[1]-1, ymd[2]));
        result.dateObj = d;
        result.timestamp = d.getTime();
        return result;
    },
});

App.DateCountCollection = Backbone.Collection.extend({
    resourceType: 'datecount',
    model: App.DateCountModel,
    initialize: function (models, options) {
        this.params = options.params;
    },
    url: function () {
        return ['/api', 'sentences', 'numfound'
            , this.params.get('keywords')
            , JSON.stringify(this.params.get('mediaModel').queryParam())
            , this.params.get('start')
            , this.params.get('end')
        ].join('/');
    },
    csvUrl: function(){
        return ['/api', 'sentences', 'numfound'
            , this.params.get('keywords')
            , encodeURIComponent(JSON.stringify(this.params.get('mediaModel').queryParam()))
            , this.params.get('start')
            , this.params.get('end')
            , 'csv'
        ].join('/')
    }
});

App.DemoDateCountCollection = App.DateCountCollection.extend({
    url: function () {
        var url = '/api/demo/sentences/numfound/';
        url += this.params.get('keywords');
        return url;
    },
    csvUrl: function(){
        return ['/api', 'demo', 'sentences', 'numfound'
            , this.params.get('keywords')
            , 'csv'
        ].join('/')
    }
});

App.ResultModel = Backbone.Model.extend({
    children: [
        {
            "name": "sentences"
            , "type": App.SentenceCollection
        },
        {
            "name": "wordcounts"
            , "type": App.WordCountCollection
        },
        {
            "name": "datecounts"
            , "type": App.DateCountCollection
        }
    ],
    initialize: function (attributes, options) {
        App.debug('App.ResultModel.initialize()');
        // Create children collections
        _.each(this.children, function (c) {
            this.set(c.name, new c.type([], options));
        }, this);
        // Bubble-up events sent by the individual collections
        _.each(this.children, function (c) {
            this.get(c.name).on('request', this.onRequest, this);
            this.get(c.name).on('error', this.onError, this);
            this.get(c.name).on('sync', this.onSync, this);
        }, this);
    },
    fetch: function () {
        _.each(this.children, function (c) {
            this.get(c.name).fetch();
        }, this);
    },
    onRequest: function (model_or_controller, request, options) {
        this.trigger('request', model_or_controller, request, options);
    },
    onError: function (model_or_controller, request, options) {
        this.trigger('error', model_or_controller, request, options);
    },
    onSync: function (model_or_controller, request, options) {
        this.trigger('sync', model_or_controller, request, options);
    }
});

App.DemoResultModel = App.ResultModel.extend({
    initialize: function (attributes, options) {
        App.debug('App.DemoResultModel.initialize()');
        App.debug(options);
        var sentences = new App.DemoSentenceCollection([], options);
        var wordcounts = new App.DemoWordCountCollection([], options);
        var datecounts = new App.DemoDateCountCollection([], options);
        this.set('sentences', sentences);
        this.set('wordcounts', wordcounts);
        this.set('datecounts', datecounts);
        // Bubble-up events sent by the individual collections
        _.each([sentences, wordcounts, datecounts], function (m) {
            m.on('request', this.onRequest, this);
            m.on('error', this.onError, this);
            m.on('sync', this.onSync, this);
        }, this);
    },
});

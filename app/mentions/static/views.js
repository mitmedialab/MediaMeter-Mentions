
App.MentionsResultListView = Backbone.View.extend({
    initialize: function (options) {
        this.render();
    },
    render: function () {
        App.debug('App.MentionsResultListView.render()');
        this.$el.html('');
        this.collection.each(function (m) {
            var view = new App.MentionsResultView({model:m})
            this.$el.append(view.el);
        }, this);
    }
});

App.MentionsResultView = Backbone.View.extend({
    template: _.template($('#tpl-mentions-result-view').html()),
    sentenceTemplate: _.template($('#tpl-mentions-sentence-view').html()),
    events: {
        'click li.refresh a': 'clickRefresh',
        'click li.about a': 'clickAbout'
    },
    initialize: function (options) {
        this.render();
        _.bindAll(this, 'clickRefresh');
    },
    render: function () {
        App.debug('MenionResultView.render()');
        this.$el.html(this.template());
        this.hideActionMenu();
        this.$('.progress').html(
            _.template($('#tpl-progress').html())()
        ).show();
        // wire up csv download
        var csvUrl = this.model.get('results').get('sentences').csvUrl();
        this.$('li.csv a').attr('href', csvUrl);
        // setup callback to populate when sentences are fetched from server
        this.listenTo(this.model.get('results').get('sentences'), 'sync', function (sentences) {
            App.debug('App.MentionsResultView.collection: sync');
            this.$('.progress').hide();
            // figure out the total sentence count
            totalSentences = sentences.last(1)[0].get('totalSentences');
            this.$('.count').html(totalSentences);
            this.$('.query-name').html(this.model.get('name'));
            // and update the header style
            this.$('.query-name').removeClass('second-query').removeClass('first-query');

            if(this.model.get('name')==App.config.queryNames[0]){
                this.$('.query-name').addClass('first-query');
            } else {
                this.$('.query-name').addClass('second-query');
            }
            this.$('mentions-result-view-content').html('');
            // now list some of the sentences
            _.each(sentences.last(10), function (m) {
                this.$('.mentions-result-view-content').append( this.sentenceTemplate({'sentence':m}) );
            }, this);
            this.delegateEvents();  // gotta run this to register the events again
            this.showActionMenu();
        });
    },
    clickRefresh: function (evt) {
        evt.preventDefault();
        this.model.execute();
        this.render();
    },
    clickAbout: function (evt) {
        evt.preventDefault();
        this.aboutView = new App.AboutView({
            template: '#tpl-about-mentions-view'
        });
        $('body').append(this.aboutView.el);
    }
});
App.MentionsResultView = App.MentionsResultView.extend(App.ActionedViewMixin);

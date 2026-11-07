/*
 * Vocabulator (c. 2015), restored 2026. This is the "local" version of the app, which kept
 * your words in the browser (localStorage) instead of on the server, so it runs as-is
 * without a backend. Changes from the original:
 *  - The three starter words are saved once, on your first visit. They used to be added
 *    again on every page load, so a deleted starter word came back after a reload and an
 *    edited one appeared twice.
 *  - A new word now shows up in "Your Words" right away (it was only inserted after the
 *    word before it, so a word that sorted first never appeared until a reload).
 *  - The delete dialog closes after deleting (it waited for an AJAX "complete" callback
 *    that localStorage never calls), and deleting your last word shows an empty state
 *    instead of crashing.
 *  - After saving an edit, the word is redrawn with the new values (the old view stayed up).
 *  - Templates escape what they print (<%- instead of <%=).
 *  - Starter word "pecadillo" spelled "peccadillo".
 *  - Words are stored under the key "appbep-vocabulator-words" (was "wordlist"), since
 *    every exhibit on appbep.com shares one browser storage area.
 *  - console.log calls removed.
 */
$(function() {
    var reentify = (function() {
            var chars = {
                '&#34;': '"'
            };

            return function(str) {
                return str.replace(/&#34;/g, function(s) {
                    return chars[s];
                });
            };
        })(),
        // 45 is generally considered the length of the longest dictionary word
        wordRE = /^\w{1,45}$/,
        wordTypeRE = /^(?:noun|verb|adj\.?|adv\.?|pron\.?)$/,
        definitionsRE = /^[\w,;:.-\s]{2,200}$/,
        SEEDED_KEY = 'appbep-vocabulator-seeded',
        initialWords = [
           {
               word: 'sesquipedalian',
               word_type: 'adj',
               definitions: 'having many syllables :LONG; using long words'
           },
           {
               word: 'peccadillo',
               word_type: 'noun',
               definitions: 'a slight offense; small mistake; misdeed, misdemeanor'
           },
           { 
               word: 'recondite',
               word_type: 'adj',
               definitions: 'hard to understand: profound, abstruse; little known, obscure'
           }

        ];

    var VocabularyWord = Backbone.Model.extend({
        initialize: function() {
            this.listenTo(this, 'change', this.splitDefinitions);
        },

        urlRoot: '/vocabulator/api/v1.0/words',

        splitDefinitions: function() {
            return this.get('definitions').split(';');
        },

        addDefinition: function(newdef) {
            this.set({
                definitions: this.get('definitions').concat(';' + newdef)
            });
        },

        defaults: function() {
            return {
                word: '<word>',
                word_type: '(noun, verb, adj, adv,pron)',
                definitions: '(definitions here)'
            };
        },

        validateWord: function(word) {
            if (!wordRE.test(word)) {
                return {
                    type: 'word',
                    message: 'Vocabulary words should be 1 to 45 alphanumeric characters (A-Za-z0-9_)'
                };
            }
        },

        validateWordType: function(word_type) {
            if (!wordTypeRE.test(word_type)) {
                return {
                    type: 'word_type',
                    message: 'Word type should be one of the following: noun, verb, adv, adj, pron'
                };
            }
        },

        validateDefinitions: function(definitions) {
            if (!definitionsRE.test(definitions)) {
                return {
                    type: 'definitions',
                    message: 'Definitions should be written in alphanumeric characters, along with periods commas and hyphens (A-Za-z0-9_,.-), and multiple definitions should be separated using a semicolon (;)'
                };
            }

        },

        validate: function (attributes, options) {
            var word = this.validateWord(attributes.word),
            word_type = this.validateWordType(attributes.word_type),
            definitions = this.validateDefinitions(attributes.definitions);

            if (typeof word !== 'undefined') return word;
            if (typeof word_type !== 'undefined') return word_type;
            if (typeof definitions !== 'undefined') return definitions;
        }
    });

    var VocabularyWordList = Backbone.Collection.extend({
        model: VocabularyWord,

        localStorage: new Backbone.LocalStorage('appbep-vocabulator-words'),

        comparator: 'word',

        nextId: function() {
            this.length + 1;
        },

        url: '/vocabulator/api/v1.0/words'
    });

    var VocabularyWords = new VocabularyWordList();

    var VocabularyWordView = Backbone.View.extend({
        // tagName: 'div',

        el: '#display_word',

        edit: {
            $word: $('#edit_word'),
            $word_type: $('#edit_word_type'),
            $definitions: $('#edit_definitions')
        },

        warnings: {
            $word: $('#edit_word_warning'),
            $word_type: $('#edit_word_type_warning'),
            $definitions: $('#edit_definitions_warning')
        },

        editWord: $('#edit_word'),

        initialize: function() {
            this.editWordType = this.$('#edit_word_type');
            this.editDefinitions = $('#edit_definitions');
            this.wordWarning = $('#edit_word_warning');
            this.wordTypeWarning = $('#edit_word_type_warning');
            this.definitionsWarning = $('#edit_definitions_warning');

        },

        events: {
            'click button[name="cancel-edit"]': "showEditWord",
            'click button[name="save-edit"]': "updateModel",
            'click .edit': 'clearWarnings'
        },

        clearWarnings: function() {
            $('#edit_word_warning').text('');
            $('#edit_word_type_warning').text('');
            $('#edit_definitions_warning').text('');
            $('#edit_save_warning').text('');
        },

        updateModel: function() {
            // TODO: if updating the model, the information also needs to be validated. Do I really want to set the attributes if they haven't been validated?
            // On the other hand, the Backbone.Model.save method automatically validates the attributes of the model. Do I really want to repeat logic? But if the model doesn't validate, how do I inform the user?
            var update = {
                word: $('#edit_word').val(),
                word_type: $('#edit_word_type').val(),
                definitions: $('#edit_definitions').val()
            },
            type,
            msg,
            self = this;

            for (var up in update) {
                if (this.model.get(up) === update[up]) {
                    delete update[up];
                }
            }
                
            this.model.set(update, {validate: true});

            if (this.model.validationError) {
                type = this.model.validationError.type;
                msg = this.model.validationError.message;
 
                if (type === 'word') {
                    $('#edit_save_warning').text(msg);
                } else if (type === 'word_type') {
                    $('#edit_save_warning').text(msg);
                } else {
                    $('#edit_save_warning').text(msg);
                }
                return false;
            } else {
                var save = this.model.save(update); 
                $('#edit_save_warning').addClass('success').text('Your word was updated successfully!');
                setTimeout(function() {
                    $('#edit_save_warning').removeClass('success').text('');
                    $('button[value="save"]').on('click', self.saveWord); 
                    // Redraw with the saved values (this used to just flip back to the old view).
                    self.render();
                }, 1000);
                return true;
            }
        },

        showEditWord: function() {
            $('.display-word-info').toggle();
            $('.editing').toggle();
        },

        template: _.template($('#display-word-template').html()),

        render: function() {
            if (!this.model) {
                this.$el.html('<p class="text-center">No words yet. Press "Add Word" to add one.</p>');
                return this;
            }
            var json = this.model.toJSON();
            json.definitions = this.model.splitDefinitions();
            this.$el.html(this.template(json));
            return this;
        }
    });


    var VocabularyWordListView = Backbone.View.extend({
        tagName: 'li',

        className: 'list-word',

        template: _.template($('#word-list-template').html()),

        initialize: function() {
            this.listenTo(this.model, "change:word", this.render); 
            this.listenTo(this.model, "destroy", this.remove);
            this.$el.on('click', function() {
                location.href = "#main_view_footer";
            });
        },

        remove: function() {
            this.$el.remove();
        },

        render: function () {
            this.$el.html(this.template({word: this.model.get("word")}));
            return this;
        }

    });

    var AddWordView = Backbone.View.extend({
        initialize: function() {
            this.render();
            this.addWord = this.$('#add_word');
            this.addWordType = this.$('#add_word_type');
            this.addDefinitions = this.$('#add_definitions');
            this.ajaxLoading = this.$('.ajax-loading-icon');
            this.addWordWarning = this.$('#addWordWarning');
        }, 

        el: '#add_word_form_wrapper',

        template: _.template($('#add-word-template').html()),

        events: {
            'click button[value="clear"]': 'clear',
            'click button[name="cancel-add"]': 'cancelAdd',
            'click .addword-input': 'clearWarnings'
        },

        cancelAdd: function(e) {
            if (e)
                e.preventDefault()
            this.clear();
            this.$el.hide();
            $('#display_word').show();
        },

        clearWarnings: function() {
            $('#addWordWarning').text('');
        },

        clear: function(e) {
            if (e)
                e.preventDefault();
            $('#add_word').val('');
            $('#add_word_type').val('');
            $('#add_definitions').val('');
            $('.ajax-loading-icon').hide();
            $('#addWordWarning').text('');
        },

        render: function () {
            this.$el.html(this.template());
            if (this.addWord) 
                this.addWord.focus();
            return this;
        },

        serialize: function () {
            return {
                word: $('#add_word').val(),
                word_type: $('#add_word_type').val(),
                definitions: $('#add_definitions').val()
            };
        },

        saveWord: function(thisthat) {
            $('button[value="save"]').off('click'); 
            var self = this,
            hash,
            newWord,
            val,
            type,
            msg;

            // disable click handler on save button
            // get the values from the form
            hash = this.serialize();
            newWord = new VocabularyWord(hash);

            VocabularyWords.create(newWord);
            if (!newWord.validationError) {
                $('#addWordWarning').addClass('success').text('Your word was successfully added!');
                thisthat.insertListElement(newWord);
                setTimeout(function() {
                    $('#addWordWarning').removeClass('success').text('');
                    self.clear();
                    $('button[value="save"]').on('click', self.saveWord); 
                    $('button[name="cancel-add"]').click();
                }, 1000);
            } else {
                $('#addWordWarning').text('Error: ' + newWord.validationError.message);
            }
        },
    });

    var VocabulatorDeleteDialogueView = Backbone.View.extend({
        el: '#delete-confirm',

        template: _.template($('#display-dialogue-template').html()),

        events: {
            'click button[name="cancel-dialogue"]': 'toggleDialogue'
        },

        initialize: function() {
            this.obg = document.getElementById('opaque_background');
            this.overlay = document.getElementById('overlay');
            this.obg.style.visibility = "hidden";
            this.overlay.style.visibility = "hidden";
        },

        toggleDialogue: function() {
            var args = [];
            args.push(this.obg);
            args.push(this.overlay);
            for (var i = 0, l = args.length; i < l; i += 1) {
                args[i].style.visibility = (args[i].style.visibility === "hidden") ? "visible" : "hidden";
            }
        },

        render: function(word) {
            this.$el.html(this.template({word: word}));
            this.toggleDialogue();
            return this;
        }
    });

    var VocabulatorView = Backbone.View.extend({
        el: $('#vocabulator'),

        initialize: function() {
            var that = this;
            // this.listView = new VocabularyWordListView(); 
            this.addWordView = new AddWordView();
            // this.deleteDialogueView = new VocabulatorDeleteDialogueView();
            VocabularyWords.fetch();
            var seeded = false;
            try { seeded = localStorage.getItem(SEEDED_KEY) === 'yes'; } catch (e) {}
            if (!seeded && VocabularyWords.length === 0) {
                _.each(initialWords, function (w) { VocabularyWords.create(w); });
                try { localStorage.setItem(SEEDED_KEY, 'yes'); } catch (e) {}
            }
            this.wordView = new VocabularyWordView({model: VocabularyWords.at(0)});
            this.render();
        },

        events: {
            'click button[name="cancel-dialogue"]': 'toggleDialogue',
            'click button[name="add_word_button"]': 'showAddWord',
            'click button[value="edit"]': "editWord",
            'click button[value="prev"]': "nextWord",
            'click button[value="next"]': "nextWord",
            'click button[value="delete"]': 'deleteDialogue',
            'click button[name="delete-word-button"]': "deleteWord",
            'click .word-list': "displayWord",
            'click button[value="save"]': 'saveWord',
            'click a[href="#display_word_info"]': 'clearAddWordForm',
            'click a[href="#add_word_container"]': 'renderAddView'
        },

        showAddWord: function() {
            $('#add_word_form_wrapper').show();
            $('#display_word').hide();
        },

        clearAddWordForm: function() {
            this.addWordView.clear();
        },

        deleteDialogue: function() {
            if (typeof this.deleteDialogueView === "undefined") {
                this.deleteDialogueView = new VocabulatorDeleteDialogueView();
            }
            var self = this;
            self.deleteDialogueView.render(self.wordView.model.get("word"));
        },

        toggleDialogue: function() {
            this.deleteDialogueView.toggleDialogue();
        },

        deleteWord: function() {
            var index = VocabularyWords.indexOf(this.wordView.model),
                indexNext;
            if (index === 0) {
                indexNext = 1;
            } else if (index === VocabularyWords.length - 1) {
                indexNext = 0;
            }
            var self = this;
            this.wordView.model.destroy({
                success: function() {
                    self.wordView.model = VocabularyWords.at(0);
                    self.wordView.render();
                    // self.$('#list_of_words').children()[index].remove();
                    $('#delete_dialogue_notifications').css({'font-size': '1.5em', 'color': '#FFFFFF'}).text('Word has been successfully deleted');
                    // (was a separate `complete` callback, which localStorage never calls)
                    setTimeout(function() {
                        self.deleteDialogueView.toggleDialogue();
                        $('#delete_dialogue_notifications').removeClass('success').text('');
                    }, 1000);
                },
                wait: true});
        },

        saveWord: function(e) {
            e.preventDefault();
            this.addWordView.saveWord(this);
        },

        nextWord: function(e) {
            var index = VocabularyWords.indexOf(this.wordView.model),
            length = VocabularyWords.length;

            if (e.currentTarget.value === 'next') {
                (index + 1 === length) ? index = 0 : index++;
            } else {
                (index === 0) ? index = length - 1: index--;
            }

            this.wordView.model = VocabularyWords.at(index);
            this.wordView.render();
        },

        editWord: function() {
            this.wordView.render();
            this.wordView.showEditWord();
        },

        displayWord: function(e) {
            var model = VocabularyWords.where({word: e.target.firstChild.nodeValue});
            this.renderWordElement(model[0]);
        },

        render: function () {
            this.renderAllListElements();
            this.renderWordElement();
            this.addWordView.render();
        },

        renderWordElement: function(model) {
            if (typeof model === "undefined") {
                model =  VocabularyWords.at(0);
            }
            this.wordView.model = model;
            this.wordView.render();
        },

        appendListElement: function (word) {
            var view = new VocabularyWordListView({model: word});
            this.$('#list_of_words').append(view.render().el);
        },

        renderAllListElements: function () {
            VocabularyWords.each(this.appendListElement, this);
        },

        insertListElement: function(model) {
            var children = this.$('#list_of_words').children(),
            length = children.length;
            var index = VocabularyWords.indexOf(model);
            var view = new VocabularyWordListView({model: model});
            view.render();
            if (index <= 0 || length === 0) {
                this.$('#list_of_words').prepend(view.el);
            } else {
                view.$el.insertAfter(children[index - 1]);
            }
        }
    });
    var App = new VocabulatorView();

});

/*
 * Restored for appbep.com (2026). Changes from the original:
 *  - Scores go to the new leaderboard API (app/leaderboard.js) instead of the old App Engine
 *    server: no reCAPTCHA. Press to Play asks the server for the puzzle, and the server
 *    checks the moves and measures the time. If the API isn't available, the game plays
 *    offline and says the score can't be saved.
 *  - The submit button's click handler was added again after every solved puzzle, so a
 *    second game could submit twice. It's now replaced each time.
 *  - Removed the author's email address and some console.log calls.
 */
requirejs(

    [
        "jquery",
        "app/model", 
        "app/view",
        "app/leaderboard"
    ],

    function ( $, model, view, leaderboard ) {
      
        /**
        * @class        Controller
        * @constructor
        * @param        {Model} model
        * @param        {view} view      
        */
        function Controller( model, view ) {

            var that = this,

                /**
                * @property     {String|null} challengeId
                * @private
                *               id of the server-issued puzzle being played,
                *               or null when playing offline
                */
                challengeId = null,

                buttons = view.buttons,

                pane_trans = 600,

                /**
                * @property     {Boolean} playFlag
                * @private      
                *               can we draw the puzzle? yes or no
                */
                playFlag = false,

                /**
                * @property     {Boolean} drawFlag
                * @private      
                *               can we draw the puzzle? yes or no
                */
                drawFlag = true; 


            // browser detection. We want to know if we're on a mobile
            // device or not. It determines how we use things
            this.ua = navigator.userAgent.toLowerCase();
            this.android = this.ua.indexOf('android') > -1 ? true : false;
            this.ios = this.ua.indexOf('iphone') > -1 ? true : false;
            this.mobile = this.android || this.ios;
            this.dim = 3; 

            if (this.mobile) {
                $(window).on('resize', function () {
                    var width = window.innerWidth;
                    var w = $('.table').width();

                    if (width < w) {
                        $('.table').css({'left': '0px'});
                    } else {

                        $('.table').css({'left': '25px'});
                    }


                });
            }
            /**
            Defining the operation of the npuzzle-pane buttons
            @events
            **/
           // $(window).on('load', 
            function bamButtons() {
               //if (!this.mobile && !view.mobile) {
                    // $('#main-content-wrapper').css({"border": "2px solid black"});
               //}
                buttons.panes.click(function (el) {

                    var button_objects = {

                        'quiz_button':      buttons.quiz,

                        'results_button':   buttons.results,

                        'explanation_button': buttons.explanation

                    };

                    var cur_obj = button_objects[el.target.id];
                    if (cur_obj === buttons.current) return;

                    $('.pane-btn').prop('disabled', true);
                    buttons.current.fadeOut({
                        duration: 300, 

                        complete: function () {
                            cur_obj.fadeIn({
                                duration: pane_trans,
                                complete: function () {  
                                    $('.pane-btn').prop('disabled', false);
                                }});
                        }
                    });
                    // cur_obj.toggle({duration: 1000});
                    buttons.current = cur_obj;

                    if (el.target.id === 'quiz_button') {
                        var top = $('#npuzzle-panes').offset().top;
                        $('html, body').animate({
                            scrollTop: top
                        }, {duration: 200, complete: that.init});
                    }
                });
            }

            bamButtons();

            /**
            @method       init 
            @param        {Array}     state
            **/
            this.init = function () {
                if (!drawFlag) return this;

                var callbacks = {
                    clickCB:        that.clickCB,

                    clickGoalTest:  that.clickGoalTest,

                    solveCB:        that.solve,

                    newstateCB:     that.newstate,

                    startCB:        that.start,

                    challengeCB:    that.challenge,

                    cancelCB:       that.cancel,

                    initTimer:      function () {
                        model.initTimerView();
                        playFlag = true;
                    }
                };



                // initialize the model 
                var init_state = model.init(that.dim, 'md'); 


                view.npuzzleview.draw(init_state, callbacks);

                drawFlag = false;
                // TODO:
                // find out the size of the currentWindow
                // currentHeight
                // currentWidth
                // if old width equals new height
                if (that.mobile) {
                    var height = window.innerHeight;
                    var width = window.innerWidth;
        
                    $(window).on('resize', function (e){
                        // alert("resizing");
                        e.preventDefault();
                        var height = window.innerHeight, 
                        width = window.innerWidth;

                        var w = $('#npuzzle_quiz').width(),
                        par = $('#npuzzle_quiz').parent(),
                        pw = par.width();

                        if (width < height) {
                            $('#npuzzle_quiz').css({'left': 0, 'margin-left': 0, 'width': pw});
                            $('.npuzzle-con').css({'left': $('#npuzzle_quiz').width() / 2, 'margin-left': -$('.npuzzle-con').width()/2});

                        } else {
                            $('#npuzzle_quiz').css({'left': pw/2, 'margin-left': -w/2 /*-$('.npuzzle-con').width()*/});
                            // alert("yeah!");
                        }

                        // view.npuzzleview.draw(init_state, callbacks);
                    });

                } 
     
            };


            /**
            Place a message notifying user on the puzzle

            @method     getdiv
            @param      {String}    str
            **/

            /*
            this.getdiv = function (str) {
                var wid= $('.npuzzle-con').innerWidth(),
                top = $('.npuzzle-con').position().top,
                mid = 250;

                var newdiv = $('<div>' + str + '</div>').css({
                                                         "position":    "relative", 
                                                         "background":  "white",
                                                         "color":       "black",
                                                         "font":        "35px bold",
                                                         "width":       mid,
                                                         "text-align":  "left",
                                                         "top":         wid/2,
                                                         "margin-left": -mid/2,
                                                         "left":        wid/2 });

                $('.npuzzle-con').append(newdiv);
                // that.ellipses(newdiv);
                return newdiv; 
            };
            */
           /**
            * @method       solve
            * @param        {Number} move
            * @return       {Number} number of moves
            */
            this.solve = function (state, callback) {

                if (!Array.isArray(state)) {
                    throw TypeError();
                }

                // the model is no longer needed
                that.stop();

                // solve the problem for the given state
                var node = model.search(state)[0];

                setTimeout(function () {
                    // clearInterval(int2);
                    $('.newdiv').text('Solution found!');

                    setTimeout(function () {
                        $('.newdiv').hide();
                        var moves = model.getMoves(node); 
                        view.npuzzleview.moves(moves, callback);
                        
                    }, 800);
                }, 2000);
        
            };
           
                      
            /**
            * Ask the server for the puzzle to play. Calls back with the state, or with
            * null when the leaderboard API isn't available (then the game plays offline).
            * @method       challenge
            * @param        {Function} callback
            */
            this.challenge = function (callback) {
                leaderboard.challenge().then(function (c) {
                    if (c) {
                        challengeId = c.id;
                        model.setInitState(c.state);
                        callback(c.state);
                    } else {
                        challengeId = null;
                        callback(null);
                    }
                });
            };

            this.playing = function () {
                return playFlag;
            };

            this.stop = function () {
                playFlag = false;
                model.stop();
            };

            this.start = function () {
                model.startTimer();
                playFlag = true;
            };

            this.cancel = function () {
                playFlag = false;
                $('#number-moves').text(0);
                model.stop();

            };

            /**
            * @method       clickCB
            * @param        {Number} move
            * @return       {Number} number of moves
            */
            this.clickCB = function (move) {

                if ( playFlag ) {
                    //model.startTimer();

                    model.incNumMoves();

                    if ( move ) { 
                        model.addMove(move);
                    }

                    return model.getNumMoves();
                } 
                

                $('.newstate').prop('disabled', false);
            }; 
   
            /**
            * @method       solve
            * @param        {Array}     state
            */
            this.clickGoalTest = function (state) {

                if ( model.goalTest(state) ) {

                    if ( playFlag ) {
                        // if meets certain criteria...
                        playFlag = false;

                        var data = model.get();
                        model.stop();

                        view.mymodal.html(view.modal_template(
                                                {
                                                 "time":        data.time_format,
                                                 "num_moves":   data.num_moves,
                                                 "online":      challengeId !== null
                                                }));
                        view.mymodal.modal();

                        var playedChallenge = challengeId;
                        challengeId = null; // each server puzzle can be submitted once

                        // .off() first: this used to pile up one handler per solved puzzle
                        $('#submit_button').off('click').on('click', function () {
                            var username = $('.username').val(),
                            interval;

                            if ( !model.validateUsername(username) ) {
                                $('.modal-ellipses').text("Names are 3-12 letters, digits or underscores.").css({'color': 'red'});
                                return;
                            }

                            // we are submitting to the server, so we need to disable
                            // the submit and thanks buttons while waiting for a response
                            $('#submit_button').prop('disabled', true);
                            $('.dismiss').prop('disabled', true);
                            $('.modal-ellipses').text('Sending').css({'color': 'black'});
                            interval = that.ellipses($('.modal-ellipses'));

                            leaderboard.submit(playedChallenge, username, data.actions).then(function (result) {
                                clearInterval(interval);
                                $('.dismiss').prop('disabled', false);

                                if (result.ok) {
                                    $('.modal-ellipses').text("You're on the board! " + result.data.moves +
                                        (result.data.moves === 1 ? " move" : " moves") + " in " +
                                        leaderboard.formatTime(result.data.timeMs) + ".").css({'color': 'black'});
                                    view.loadResults();
                                    setTimeout(function () {
                                        view.mymodal.modal('hide');
                                    }, 2000);
                                    return;
                                }

                                var messages = {
                                    invalid_name:      "That name isn't allowed. Try another one.",
                                    unknown_challenge: "This puzzle expired (or was already submitted), so it can't be saved.",
                                    not_solved:        "The server didn't agree the puzzle was solved.",
                                    busy:              "The server is busy. Try again in a moment."
                                };
                                $('.modal-ellipses').text(messages[result.error] ||
                                    "Couldn't reach the server. Try again later.").css({'color': 'red'});

                                // a bad name can be fixed and resent; the other errors can't
                                if (result.error === 'invalid_name' || result.error === 'busy' || result.error === 'network') {
                                    $('#submit_button').prop('disabled', false);
                                }
                            });
                       });

                    } else {
                        view.newdiv.show().text("You solved it!");

                        setTimeout(function () {
                            view.newdiv.css({'display': 'none'}).text('');
                        }, 2000);
                    }

                    $('.newstate').prop('disabled', false);
                    $('.solve').prop('disabled', true);
                    $('.quit').hide();
                } else {
                    return this;
                }
            };
          
            /**
            * @method       newstate
            * @return       {Array}
            *
            */
            this.newstate = function () {
               return model.init(that.dim, 'md');
            };

           
            /**
            * @method       getModel
            * @return       {Model}
            *
            */
            this.getModel = function () {
                return model;
            };


            /**
            * @method       getView
            * @return       {Object} 
            */
            this.getView = function () {
                return view;
            };

            /**
            * @method       ellipses
            * @param        {HTMLDiv} 
            * @return       {Number} interval
            */
            this.ellipses = function (el) {
                var str0 = '',
                str1 = '.',
                str2 = '..',
                str3 = '...',
                current = str1,
                speed = 250,
                val = el.text();

                function showEllipses() {
                    el.text(val + current);
                    
                    if (current === str1) {
                        current = str2;
                    } else if (current === str2) {
                        current = str3;
                    } else if (current === str3) {
                        current = str0;
                    } else {
                        current = str1;
                    }
                }

                return setInterval(showEllipses, speed);

           };
 
       }

       Controller.npuzzizzle = {
            name: "NPuzzizzle",

            version:    "0.2",

            author: {
                "name": {
                    "first":    "Bambridge",
                    "last":     "Peterson"
                }
           }
       };

       //return Controller;
       $(document).ready(function() {
           return new Controller(model, view);
       });
       // return new Controller(model, view);
    }
);

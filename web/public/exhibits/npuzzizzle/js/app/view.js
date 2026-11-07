/*
 * Restored for appbep.com (2026). Changes from the original:
 *  - The Results pane reads the new leaderboard API (app/leaderboard.js): Today or All-time,
 *    ranked by moves and by time. With no API yet, it says the leaderboard isn't open.
 *  - "Press to Play" fetches the puzzle from the server before revealing it (see
 *    controller.challenge), so the server's clock starts when the player can see the tiles.
 *  - No reCAPTCHA.
 */
define(
    [
        'jquery', 
        'handlebars', 
        'lib/utils.timer',
        'bootstrap',
        'app/leaderboard',
    ], 

    function ($, Handlebars, timer, bootstrap, leaderboard) {
        //console.log($);
        /**

        The view object. Holds all the properties of the view for this application

        @module   view
        **/
        var view = {};

        
        var results_template =  Handlebars.compile($("#results_template").html()),
        puzzletools_template =  Handlebars.compile($('#puzzletools_template').html()),
        modal_template =        Handlebars.compile($('#npuzzle_modal').html());

        view.templates = {};
        view.templates.results = results_template;

        view.results = {};
        view.results.moves = $("div.results_moves");
        view.results.time = $("div.results_time");


        /**
        Which board the Results pane shows: 'today' or 'alltime'.
        @property   board
        **/
        view.board = 'today';

        /**
        Show one ranking (moves or time) in its table.

        @method     displayResults
        @param      {String}            by - 'moves' or 'time'
        @param      {BoardResponse|null} data - from the API, or null if it isn't available
        **/
        view.displayResults = function (by, data) {
            var el = by === 'moves' ? view.results.moves : view.results.time;

            if (data === null) {
                el.addClass('ital').text("The leaderboard isn't open yet. You can still play!");
                return;
            }

            if (data.entries.length === 0) {
                el.addClass('ital').text(data.board === 'today' ? 'No scores yet today. Be the first!' : 'No scores yet.');
                return;
            }

            el.removeClass('ital').html(results_template(data.entries.map(function (e) {
                return {
                    rank:   e.rank,
                    name:   e.name,
                    moves:  e.moves,
                    time:   leaderboard.formatTime(e.timeMs),
                    date:   new Date(e.at).toLocaleDateString()
                };
            })));
        };

        /**
        Fetch both rankings for the current board and show them.

        @method     loadResults
        **/
        view.loadResults = function () {
            ['moves', 'time'].forEach(function (by) {
                leaderboard.board(view.board, by).then(function (data) {
                    view.displayResults(by, data);
                });
            });
        };

        $('.board-btn').click(function () {
            view.board = $(this).attr('data-board');
            $('.board-btn').removeClass('active').attr('aria-pressed', 'false');
            $(this).addClass('active').attr('aria-pressed', 'true');
            view.loadResults();
        });

        view.npuzzleview = (function () {
            var puzzle_size =  480,

            dim = dim || 3,

            size = dim * dim,

            block_size = puzzle_size / dim,

            border_size = 3,

            move_size = block_size + border_size,

            i, j, 

            puzzleBlockRegistry = [],

            speed = 200,

            my = {},

            current_state,

            drawnFlag = false;

            /**
            * @method       getState
            * @private
            * @return       {Array} state
            */
            function getState() {
                var i = 0,
                l = puzzleBlockRegistry.length,
                state = [],
                t;
                
                for (i = 0; i < l; i += 1) {
                    t = parseInt($(puzzleBlockRegistry[i]).text(), 10);    
                    if (isNaN(t)) t = 9;
                    state.push(t);
                }

                return state;
            }

            /**
            * @method       newState
            * @private  
            * @param        {Array}  state - newstate for puzzle 
            */
            var newState = function (state) {
                // we need to do a few things
                // 1. We need to get the index of the value 'size' in state
                // 2. We need the blank_spot index. 
                // 3. we need to switch those two in the puzzleBlockRegistry
                // 4. We need to move the 'blank space' to new location
                // 5. then redraw the numbers on the blocks.

                // only one of the elements in puzzleBlockRegistry
                // is a number. The rest are HTMLDiv elements
                var s = state.indexOf(size),
                index,
                blank_space = puzzleBlockRegistry.indexOf(size),
                l = puzzleBlockRegistry.length,
                x,
                y,
                top,
                left,
                i;

                if (s === -1) {
                    throw {
                        "name": "IndexError",
                        "msg":  "Can't find element " + size + " in " + state
                    };
                }

                /**
                * @method       redrawNums
                *
                */
                function redrawNums() {

                    for (i = 0; i < l; i += 1) {
                        if (state[i] !== size) {
                            $(puzzleBlockRegistry[i]).text(state[i]);
                        } 
                    }

                }

                // if the index of 'size' in state is equal to the
                // current blank_space, just redraw the numbers on
                // the puzzle blocks. If not, we need to get the 
                // coordinates for spot in the puzzle where the
                // blank_space will be located.
                if (s === blank_space) {
                    redrawNums();
                } else {
                    // pos = $(puzzleBlockRegistry[s]).position();
                    // calculate the (x,y) coordinates of the new position
                    x = blank_space % dim;
                    y = Math.floor(blank_space / dim);
                    top = y*(block_size) + (y + 1)*border_size;
                    left = x*block_size + (x + 1)*border_size;

                    $(puzzleBlockRegistry[s]).css({"top": top, "left": left});

                    // swap in puzzleBlockRegistry
                    puzzleBlockRegistry.swap(s, blank_space);
                    redrawNums();
                }
            };

            /**
            * @function     move_by_click
            * @param        {???}   what is t? A target?        
            * @param        {Function}  cb - callback
            */
            var move_by_click = function (t, cb) {
                var tar = $(t.target),

                index = parseInt(puzzleBlockRegistry.indexOf(t.target), 10),

                blank_spot = puzzleBlockRegistry.indexOf(size),

                move,

                opts = {duration: speed};

                if (cb) {
                    opts.complete = function () {
                        cb( getState() );
                    };
                }

                if (index === blank_spot + dim) {

                    // then the cicked block is below the blank spot
                    // so we must move the object up
                    // this is decreasing the top position

                    tar.animate({top: '-=' + move_size}, opts);
                    move = -2;
                } else if (index === blank_spot - dim) {
                    // else move down
                    tar.animate({top: '+=' + move_size}, opts);
                    move = 2;
                } else if (index === blank_spot + 1) {
                    tar.animate({left: '-=' + move_size}, opts);
                    move = 1;
                } else if (index === blank_spot - 1 ) {
                    tar.animate({left: '+=' + move_size}, opts);
                    move = -1;
                } else {
                    return 0;
                }

                puzzleBlockRegistry.swap(index, blank_spot);
                blank_spot = index;

                return move;
            };

            /**
            * @function     move_by_dir
            * @param        {Number}    direction to move 'blank_spot'
            * @param        {Function}  functio to call after moving the object
            */
            var move_by_dir = function (dir, cb)  {
                var blank_spot = puzzleBlockRegistry.indexOf(size),

                index, 
                
                d = dim, 
                
                s = size,

                el, toMove, way;                     

                // move 'blank_spot' to the left (negative x-axis)
                if ( dir === -1 ) {
                    
                    if ( blank_spot % d === 0 ) { // throw Error?
                        return; 
                    }

                    index = blank_spot - 1;
                    el = puzzleBlockRegistry[index];
                    $(el).animate({'left': '+=' + move_size}, {duration: speed, complete: cb});
                // moves blank_spot to the right (positive x-axis)
                } else if ( dir === 1 ) {
                    if ( blank_spot % d === d - 1) {
                        return; 
                    }

                    index = blank_spot + 1;
                    el = puzzleBlockRegistry[index];
                    $(el).animate({'left': '-=' + move_size}, {duration: speed, complete: cb});
                } else if ( dir === -2 ) {
                    if ( blank_spot + d > s - 1 ) {
                        return;
                    }

                    index = blank_spot + d;
                    el = puzzleBlockRegistry[index];
                    $(el).animate({'top': '-=' + move_size}, {duration: speed, complete: cb});
                } else if ( dir === 2) {
                    if ( blank_spot - d < 0) {
                        return;
                    }

                    index = blank_spot - d;
                    el = puzzleBlockRegistry[index];
                    $(el).animate({"top": '+=' + move_size}, {duration: speed, complete: cb});
                } else {
                    throw {
                        name: "DirectionError",
                        msg: "Invalid direction " + d + " given"
                    };
                }

                puzzleBlockRegistry.swap(index, blank_spot);
            }; // move_by_dir

            function setPuzzleSize() {
                var newsize = Math.min(window.innerWidth, window.innerHeight); 
                     //window.innerWidth >= window.innerHeight ? window.innerHeight : window.innerWidth;
                
                if (newsize < 480) {
                    // newsize = 320;
                    border_size = (0.00625)*newsize;
                    newsize = newsize - 50;
                    puzzle_size = newsize;
                    block_size = puzzle_size / dim;
                    move_size = block_size + border_size;
                }

                drawnFlag = true;
            }
           /**
            * @function     drawNPuzzle
            * @param        {Array} stte 
            * @param        {Function} callback
            * @param        {Function} cb   
            */
            var drawNPuzzle = function ( state, callbacks) {
                if ( !drawnFlag ) 
                    setPuzzleSize(); 

                state = state || [1, 2, 3, 4, 5, 6, 7, 8, 9];

                var size = state.length,

                dim = parseInt(Math.sqrt(size),10),

                // blank_spot is set for the nPuzzleGui
                blank_spot = state.indexOf(size),

                // block_size = puzzle_size/dim,

                outer_border_size = 5,

                padding = 20,

                con_width = puzzle_size + (dim + 1)*border_size + 2*outer_border_size,

                con_height =  con_width,  //puzzle_size + (dim + 1)*border_size + 2*border_size,

                npuzzle_quiz = $('#npuzzle_quiz'),

                par = npuzzle_quiz.parent(),

                pwid = par.width(),

                pheight = par.height(),

                smaller = pheight >= pwid ? pwid : pheight,

                larger = pheight >= pwid ? pheight : pwid,

                i, j, puzzleBlock, thetop, theleft,

                color = 'blue',

                tb;

                clickCallback = function (t) {
                    var m = move_by_click(t, callbacks.clickGoalTest);
                    if (m === 0) return;
                    var n = callbacks.clickCB(m);
                    $('#number-moves').text(n);
                };

                // dynamically assign css properties to the npuzzle_quiz element
                // we make calculations for the div based on the parent width and height
                npuzzle_quiz.css({
                    "position":         "relative",

                    "width":            pwid, 

                    "height":           pheight

                    // "padding-top":      "10px",

                    // "border":           "1px solid black"
                });

               var divcss = {
                        'position':         'absolute', 

                        'top':              "60px", 

                        'left':             pwid / 2,   // window.innerWidth / 2  

                        'margin-left':      -con_width / 2, //-c/2,  

                        'width':            con_width, 

                        'height':           con_height,  

                        'border':           outer_border_size + "px dotted blue", 

                        'backgroundColor':  "black"
                };

                var condiv = $('<div></div>').addClass('con-div');

                condiv.append( $('<div></div>').html(puzzletools_template(
                        {
                            "button_name":      "New State",

                            "index":            "Enter a state"
                        }))
                );
              
                var newdiv = $('<div></div>').css(divcss).addClass('npuzzle-con'); 

                
               
                divcss.display = "none"; 
                divcss["z-index"] = 1;

                var newdiv2 =$('<div></div>').css(divcss).addClass('npuzzle-con').append($('<button>Press to Play</button>').css({
                    "position":     "absolute",

                    "top":          con_height/2 - 25,
                    
                    "left":         con_width/2,
            
                    "width":        200,

                    "height":       50,

                    "margin-left":  -100
                }).addClass('btn-sm press').click(function () {
                    var button = $(this);
                    button.prop('disabled', true).text('Loading...');

                    // Get the puzzle from the server (null = play offline with the
                    // local one already drawn under this cover), then reveal it.
                    callbacks.challengeCB(function (state) {
                        if (state) {
                            newState(state);
                        } else {
                            $('.offline-note').show();
                        }

                        // disable solve and newstate buttons once
                        // the person starts to play the game
                        $('.solve').prop('disabled', false);

                        $('.newstate').prop('disabled', false);

                        newdiv2.hide();
                        button.prop('disabled', false).text('Press to Play');

                        callbacks.startCB();
                    });
                }));
               
                var mycallback = function () {
                    var color = $(this).css('backgroundColor');
                    color = "rgb(0, 0, 205)";
                    $(this).css({"cursor": "pointer"});
                    $(this).css({'backgroundColor': color });
                };

                var mouseout = function () {
                    $(this).css({'backgroundColor': 'blue' });
                };
                /*
                    npuzzle_quiz is the primary element
                    
                    its parent is npuzzle-panes, in main-content in index.html

                    we append the puzzletools template (toolbar for the quiz) to this
                */
                // create the puzzle blocks usings div elements
                for ( i = 0; i < dim; i += 1 ) {

                    for ( j = 0; j < dim; j += 1 ) {

                        // set the top and left positions of the division
                        // they are set
                        thetop = (i + 1)*border_size + i * block_size;
                        theleft = (j + 1)*border_size + j * block_size;
                        var place = i*dim + j;

                        // give the appropriate text for the puzzle Blocks
                        // there should be no block for the value size - 1
                        // so for the 8-puzzle, the
                        if ( state[place] === size) {
                            puzzleBlockRegistry.push(size);
                            blank_spot = place;
                            continue;
                        } else {
                            color = color;
                            txt = state[place];
                        }

                        /* 
                        * puzzleBlock
                        *
                        */
                        puzzleBlock = $('<div></div>').css({
                                    'position': 'absolute', 

                                    'top': thetop, 

                                    'left': theleft, 

                                    'width': block_size, 

                                    'height': block_size, 

                                    'color': 'white',

                                    'font': 0.75*puzzle_size/dim + 'px times new roman',

                                    'backgroundColor': color,

                                    'textAlign':    "center"
                        }).addClass('npuzzle-block').text(txt);
                       
                        // add event listeners for each puzzleblock
                        // need a click event
                        // also mouseover (cursor and background color change)
                        // also mouseout
                        puzzleBlock.click(clickCallback);

                        puzzleBlock.mouseover(mycallback);
                            /*function () {
                            var color = $(this).css('backgroundColor');
                            color = "rgb(0, 0, 205)";
                            $(this).css({"cursor": "pointer"});
                            $(this).css({'backgroundColor': color });
                        }*/

                        puzzleBlock.mouseout(mouseout);

                        // add HTML element to the puzzleBlockRegistry
                        puzzleBlockRegistry.push(puzzleBlock[0]);

                        // append to the newdiv
                        newdiv.append(puzzleBlock);
                    } // end of for
                } // end for 
   
            // append the newdiv to condiv, which contains both
            // the 'toolbar' and the puzzle
            condiv.append(newdiv);

            npuzzle_quiz.html(condiv);
            npuzzle_quiz.append(newdiv2);
            var wid= $('.npuzzle-con').innerWidth(),
                top = $('.npuzzle-con').position().top,
            mid = 300;

            view.newdiv = $('<div></div>').css({
                                         "display":     "none",
                                         "position":    "relative", 
                                         "background":  "black",
                                         "color":       "white",
                                         "font":        "35px bold",
                                         "width":       mid,
                                         "text-align":  "center",
                                         "top":         wid/2,
                                         "margin-left": -mid/2,
                                         "left":        wid/2 }).addClass('newdiv');

            $('.npuzzle-con').append(view.newdiv);




            view.newdiv = $('.newdiv');

            
            // initialize view elements
            // Add callbacks to elements that were drawn

            /**
            @event      click

            **/
            $('.solve').click(function () {
                view.newdiv.show().text("Solving...");
                // disable all buttons on page while puzzle is being solved
                $('button').prop('disabled', true);
                $('.quit').hide();
                $('.timer').hide();
                $('.npuzzle-block').off('click');
                // solve the puzzle
                callbacks.solveCB(getState(), clickCallback);
                
                return this;
            });

      
            /**
            @event      click

            **/
            $('.play-btn').click(function () {

                $(this).hide();

                callbacks.initTimer();
                $('.quit').show();

                $('.timer').show();
                
                $('.solve').prop('disabled', true);
                $('.newstate').prop('disabled', true);

                // reset the text in the 'num_moves' div
                $('#number-moves').text(0);

                // the "new play button" and the black background covering the newState
                // we're going to create
                newdiv2.show();

                // get a new random state for the user
                var state = callbacks.newstateCB();

                // redraw a new state that the user hasn't seen
                // that is the reason for the newdiv2
                newState(state);
            });

            /**
            @event

            **/
            $('.quit').click(function () {
                $('.play-btn').show();
                $('.timer').hide();
                $(this).hide();
                newdiv2.hide();

                callbacks.cancelCB();
                $('#number-moves').text(0);

                $('.solve').prop('disabled', false);
                $('.newstate').prop('disabled', false);
            });


            /**
            When we click on the newstate button, 
            @event      click on newstate button

            **/
            $('.newstate').click(function () {

                $('.solve').prop('disabled', false);
                $('.play-btn').prop('disabled', false);               
                $('.quit').hide();

                var state = callbacks.newstateCB();

                newState(state);
                $(this).prop('disabled', true);
                $('.play-btn').show();
                $('.timer').hide();
            });

            $('.quit').toggle();

            $('.timer').toggle();

        }; // end of drawNPuzzle

        
        
        return {
            by_click:   move_by_click,

            by_dir:     move_by_dir,

            draw:       drawNPuzzle,
                
            moves:      function (dirs, callback) {
                            dirs.pop();

                            function callMoveBlock () {
                                if (dirs.length === 0) return;
                                var d = dirs.pop();
                                move_by_dir(d, callMoveBlock);


                                if (dirs.length === 0) {
                                    $('button').prop('disabled', false);

                                    $('.solve').prop('disabled', true);
                                    $('.play-btn').show();
                                    if (callback) {
                                        $('.npuzzle-block').click(callback);
                                    }
                                } 
                            }
                            
                            callMoveBlock();
                        },

            buttons:    {
                    solve: $('.solve')
            }
        };
    }()); // soon to be end of nPuzzleGui

    $('#npuzzle_results').show();

    view.npuzzizzle = {};
    /**
    All the buttons for the view

    @module     view
    @submodule  buttons
    **/
    view.buttons = {};
    var init = false;

    function initStuff() {
        init = true;
        view.buttons.newstate = $('#newstate-button');

        view.buttons.quiz = $('#npuzzle_quiz');

        view.buttons.results = $('#npuzzle_results');

        view.buttons.explanation =  $('#npuzzle_explanation');

        view.buttons.panes = $('.pane-btn');

        view.buttons.current = view.buttons.results;

        view.buttons.submit = $('#submit-button');

        view.buttons.dismiss = $('.dismiss');

        view.mymodal = $('#npuzzle_modal');


        view.modal_template = modal_template;

        view.loader = $('.loader');

        view.npuzzizzle.currentInnerHeight = window.innerHeight;
        view.npuzzizzle.currentInnerWidth = window.innerWidth;
        view.npuzzizzle.currentOuterHeight = window.outerHeight;
        view.npuzzizzle.currentOuterWidth = window.outerWidth;
        view.npuzzizzle.currentHeight = window.innerHeight;
        view.npuzzizzle.currentWidth = window.innerWidth;
        view.npuzzizzle.currentHeight = window.innerHeight;
        var ua = navigator.userAgent.toLowerCase();

        view.loadResults();
        // view.init();
        view.mobile = (ua.indexOf('android') > -1 || ua.indexOf('iphone') > -1 ||
            ua.indexOf('ipad') > -1) ? true: false;
    }

    // console.log("What happened? $ = " + $);
    $( document ).ready(function () {
        initStuff();
    });
    window.addEventListener('load', function () {
        if (!init) initStuff();
    });
    // window.addEventListener('resize', view.resize, false);

    return view; 
});

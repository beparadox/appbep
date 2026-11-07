define(

    [
    'jquery', 
    'lib/utils.timer'
    ],
    
    function ($, timer) {
        var timeizzle = {};

        var view = (function () {
            var main = $('#main-content'),
            start,
            pause,
            clear,
            v = {};
            v.d_time = '00:00:000',
            v.initalized = false;

    
            // v.main = $('<span></span>');
            v.init = function ( m, cb ) {
                if (m) {
                    main = $(m);
                }
                // main.append(v.main.addClass('center border').text(v.d_time));
                main.addClass('center ').text(v.d_time);
                // main.html(main.addClass('center border').text(v.d_time));

                v.main = main;
                v.initialzed = true;

                if ( cb ) {
                    cb();
                }
            };

            v.setMain = function (newmain) {
                if (typeof newmain !== "string") {
                    return this;
                }
                main = $(newmain);
                v.main = main;
            };

            return v;
        }());


        var model = (function (view) {
            var timerRunning = false,
            timerPaused = false,
            now,
            m = {},
            interval,
            start,
            totalTime = 0;
            
            // model of the timer
            // timerRunning {Boolean}
            // timerPaused
            // now
            // totalTime
            // start

            m.setNow = function () {
                now = Date.now();
            };

            m.getNow = function () {
                return now;
            };

            m.timerRunning = function () {
                return timerRunning;
            };

            m.startTimer = function () {
                if (timerRunning) return this;

                start = Date.now();
                now = start;
                timerRunning = true;
                timerPaused = false;
                m.updateTimer();
            };

            m.stopTimer = function () {
                clearInterval(interval);
                timerRunning = false;
            };

            m.clearTimer = function () {
               // clear the three variables used for
               // the timer
               m.stopTimer();
               start = 0;
               now = 0;
               totalTime = 0;
               timerRunning = false;
               timerPaused = false;
               view.main.text(view.d_time);
            };

            m.pauseTimer = function () {
                totalTime = now;
                timerPaused = true;
                m.stopTimer();
            };

            m.updateTimer = function () {
                function ut() {
                    now = Date.now() - start;
                    now += totalTime;
                    view.main.text(timer.formatTime(now));
                }
                interval = setInterval(ut, 1);
            };
            
            m.getTotalTimeFormatted = function () {
                //return timer.formatTime(totalTime);

                return timer.formatTime(now);
            };
            m.getTotalTime  = function () {
                //return totalTime;

                return now;
            };


            return m;
        }(view));
        
   
        timeizzle.controller = (function (view, model) {
            var controller = {};

            controller.setMain = function (main) {
                view.setMain(main);
            }

            controller.pause = function () {
                model.pauseTimer();
            };
            
            controller.clear = function () {
                model.clearTimer();
            };

            controller.getTimeFormatted = function () {
                return model.getTotalTimeFormatted();
            };

            controller.getTime = function () {
                return model.getTotalTime();
            };

            controller.start = function (main) {
                console.log(main);

                view.init(main, model.startTimer);
            };

            controller.initView = function () {
               // view.setMain('#clock-too'); 
                view.init('#npuzzle-timer');
            };

            controller.initView();

            $('.timer-btn').click(function (target) {
                var val = this['value'];
                
                if (val === 'start') {
                    controller.start();
                } else if (val === 'pause') {
                    controller.pause();
                } else {
                   //  m.stopTimer();
                    controller.clear();
                }

            });



            return controller;
        }(view, model));

        
        // timeizzle.controller.init();

        return timeizzle;
    }
);



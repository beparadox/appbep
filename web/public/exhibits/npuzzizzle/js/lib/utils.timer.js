define(

// dependencies
['lib/utils'],

function (utils) {

    /**
    * @module
    *
    *
    */
    utils.timer = {};

    /**
    * @method:      formatTime
    * @param:       {Number} time time in milliseconds. Should   
    *
    */
    utils.timer.formatTime = (function () {
        var SID = 86400,
        MILL = 1000,
        SEC = 60,
        MIN = 60,
        HOURS = 24;

        return function (time, format) {
            var hours,
            mins,
            secs,
            mills,
            floor = Math.floor;

            time = parseInt(time, 10);

            if (typeof time !== "number"
                || time >= SID * MILL) {

                throw {
                    name: "InvalidTime",
                    msg: "Invalid time value given"
                }
            } 

            mills = time % 1000; 
            secs = floor( time / 1000 % 60);
            mins = floor( (time / 1000) / 60 % 60 );
            hours = floor( (time / 1000) / 3600 % 60);

            if (mills === 1000) {
                mills = 0;
            }

            if (mills < 100) {
                mills = '0' + mills;
            }

            if (mills < 10) {
                mills = '0' + mills;
            } else if (mills === 0) {
                mills = '000';
            }
        
            if (secs === 0) {
                secs = '00';
            } else if (secs < 10) {
                secs = '0' + secs;
            }

            if (mins < 10) {
                mins = '0' + mins; 
            }

            if (hours < 10) {
                hours = '0' + hours;
            }

            if (format === "hours") {
                return hours + ":" + mins + ":" + secs + ":" + mills;
            } else {
                    return mins + ":" + secs + ":" + mills;
            }
        }
    }());

    return utils.timer;
}

);


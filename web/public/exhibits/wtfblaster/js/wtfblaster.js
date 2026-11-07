/*
 * Restored for appbep.com (2026). Changes from the original:
 *  - Only the Packers vs. Bears matchup is kept. The True Detective and Obama vs. Putin
 *    matchups used photos of real people and characters, so their images and options
 *    are gone.
 *  - The score server is gone (no reCAPTCHA, no name entry). Finished games can be saved
 *    as personal bests in this browser's localStorage; the side tables show those.
 *  - Image paths are relative, so the game works from any folder.
 *  - On touch screens, touch-controls.js adds an on-screen pad that drives the same
 *    key handlers as the keyboard.
 *  - Removed some console.log calls, including one inside a loop.
 *  - resizeTable() returns early when there are no tables (it used to throw).
 * Everything else is as written in 2013-15.
 */
/*
==============================================================================
*@name      WTFBlaster
 @file:     wtfblaster.js
*@author:   Bambridge E. Peterson
*@date: 2013, 2014
*@desc      A basic HTML5 Programming Game - a throwback to the
            classic single person shooter arcade games
*
*
*
===============================================================================
*/

(function() {

/* 
 requestAnimationFrame code

 http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 requestAnimationFrame polyfill by Erik Möller
 fixes from Paul Irish and Tino Zijdel
*/ 

    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] ||
            window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

(function (window) {
    "use strict";
    // vARIOUS PROPERTIES
    
    /**
    Main module of the WTFBlaster game
    @module     WTFBLASTER
    @main WTFBlaster
    **/
    var WTFBLASTER = {};

    var canvas_element = null, 

    title_canvas = null,

    points_canvas = null,

    body = null, 

    main_content = null, 

    stop_button = null, 

    send_game_server = null, 

    enter_name = null, 

    canvas = null, 

    game_canvas_wrapper = null,

    GAME_TIME_LIMIT = 30,

    CANVAS_WIDTH = 720, //720,
        
    CANVAS_HEIGHT = 480, //480,

    currentHeight = null,

    currentWidth = null,

    META_BAR_HEIGHT = CANVAS_HEIGHT / 20,

    MEDIA,

    STYLES,

    META,

    WTFBlaster,

    introScreen,
    
    modal_template,

    results_template,

    slowPerformance = false,
    
    topten_template;

    // keep the player from leaving the canvas
    Number.prototype.clamp = function (min, max) {
        return Math.min(Math.max(this, min), max);
    };

    /**
    @module         WTFBlaser
    @submodule      STYLES  
    **/
    STYLES =  {
        fonts : {
            getFont: function () {
                return this.size + this.measure + " " + this.style;
            },

            start: {
                fontstyle: "Monospace",
                fontmeasure: "px",
                text: "Press to start",
                font: (canvas_element && canvas_element.height / 16) || (CANVAS_HEIGHT / 16) + "px Monospace", //this.fontsize + this.fontmeasure + " " + this.fontstyle,
                f: function () {
                    this.fontsize = canvas_element ? canvas_element.height / 16 : (CANVAS_HEIGHT / 16);
                    //this.fontsize = "px Monospace";
                    return this.fontsize + this.fontmeasure  + " " + this.fontstyle;
                 }
            }, 

            footer: {
                size: CANVAS_HEIGHT / 33.33,
                style: "Gothic",
                measure: "px",
                text: "2013-2015 WTFBlaster"
            },
                    
            title: {
                style: "Monospace",
                measure: "px",
                text: "WTFBlaster",
                shadowBlur: 30,
                shadowColor: "red",
                getFont: function () {
                    this.size = canvas_element ? canvas_element.height / 4.5 : CANVAS_HEIGHT / 4.5;
                    return "bold " + this.size + this.measure + " " + this.style;
                }
            },

            subtitle: {
                size: CANVAS_HEIGHT / 6,
                style: "Verdana",
                measure: "px",
                getFont: CANVAS_HEIGHT / 6 + "px" + "Verdana" // this.size + this.measure + this.style
            },
 
            end : {
                fontsize: CANVAS_HEIGHT / 10,
                fontstyle: "Verdana",
                fontmeasure: "px"
            }
        }
    };
   
    // main_content.appendChild(canvas_element);

    /**
    * MEDIA is a object for storing audio and image
    * files loaded from the server.
    *
    @module         WTFBLASTER
    @submodule      MEDIA 
    @type           Object 
    @names imageRepository {Object}, soundRepository {Object}
    **/
    MEDIA = {
        /**
        @module         MEDIA
        @submodule:     MEDIA.images
        @type:          Object
        **/

        images: {


            images: {
                packersimage: 'img/PackersLogo.gif',
                bearsimage: 'img/BearsLogo.gif',
                explosionimg: 'img/explosion.png',
                playicon: 'img/play_icon.png'

            },

            init: function (callback) {
                var key,
                last,
                self = this;

                for (key in this.images) {
                    this[key] = new Image();
                    this[key].src = this.images[key];
                    this[key].style.background = "transparent";
                    // hackey way to define the last image called
                    // so we can define a callback when it loads
                    last = this[key];
                }

                last.onload = function () {
                    // console.log("images all loaded!");
                    //self.playerimage = self.rustimage;
                    // console.log(self.playerimage);
                    self.enemyimage = self.bearsimage; // self.errollimage;
                    self.playerimage = self.packersimage; // self.playerimage;
                    self.playerimageType = "packers";
                    self.enemyheight = CANVAS_HEIGHT / 11.765;
                    self.enemywidth = CANVAS_WIDTH / 11.765;
                    self.playerheight = CANVAS_HEIGHT / 11.765;
                    self.playerwidth = CANVAS_WIDTH / 11.765;

                    // player.init();
                   $(':input').on('change', function (data) {
                        changeImages(data);
                   });
                   
                   callback();
                };
            }
        },

        sound: {
            soundfiles: {
                "explosion": ['/sounds/explosion.mp3', 100],
                "shoot": ['/sounds/shoot.mp3', 101]
            },


            handler: function (event) {
                var instance = createjs.Sound.play("explosion");
                instance.volume = 0.3;
                startGame();
            },

            init: function () {
                var key,
                self = this;
              
                createjs.Sound.alternateExtensions = ["ogg", "wav"];
                var manifest = [
                    {src: "sounds/explosion.mp3", id: "explosion"},

                    {src: "sounds/shoot.mp3", id: "shoot"}
                ];

                var numfiles = 0;
                // createjs.Sound.alternateExtensions = ["ogg", "wav"];
                createjs.Sound.addEventListener("fileload", createjs.proxy(function (event) {
                    numfiles += 1;

                    if (numfiles === manifest.length) startGame();
                }, this));


                createjs.Sound.registerManifest(manifest);
            }
        }
    };

  
    /**
    @class          IntroScreen
    @constructor        
    */
    function IntroScreen () {
        var fonts = STYLES.fonts,
        self = this;

        this.animationFrame = null;
        this.points= [];
        this.titletext = fonts.title.text;
        this.titlefont = fonts.title.getFont();
        this.subtitle = fonts.subtitle.getFont; 
        this.starttext = fonts.start.text;
        this.footerfont = fonts.getFont.apply(fonts.footer);
        this.footertext = fonts.footer.text;
        this.X = canvas_element.width / 2; 
        this.Y = canvas_element.height / 2;
        this.Z = canvas_element.height / 3;

        this.visible = false;

        var i = 0,
        num_points = 100,
        x, y, z;
        
        for (i; i < 100; i += 1) {
            x = Math.floor(Math.random() * CANVAS_WIDTH);
            y = Math.floor(Math.random() * CANVAS_HEIGHT);
            z = (i % 3) + 1;
            this.points.push([x,y,z]);
        }

        canvas.fillStyle = "#000000";
        canvas.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        canvas.fillStyle = "#FFFFFF";

        for (i = 0; i < num_points; i += 1) {
            canvas.fillRect(this.points[i][0], this.points[i][1], this.points[i][2], this.points[i][2]);
        }

        function draw () {
            canvas.fillStyle = "#000000";
            canvas.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            canvas.fillStyle = "#FFFFFF";

            self.points.forEach(function (x) {
                canvas.fillRect(x[0], x[1], x[2], x[2]);
            });

            //canvas.font = "bold " + self.titlefont; 
            canvas.font = fonts.title.getFont();
            canvas.textAlign = "center";
            // canvas.shadowBlur = fonts.title.shadowBlur;
            canvas.shadowColor = fonts.title.shadowColor;
            canvas.fillText(self.titletext, self.X, self.Z);

            // 'Press to start'
            canvas.font = fonts.start.f();
            // canvas.textAlign = "center";
            canvas.fillText(self.starttext, self.X, self.Y + (self.Y / 5));

            // footer
            canvas.font = self.footerfont;
            // canvas.textAlign = "center";
            canvas.fillText(self.footertext, self.X, self.Y * 2 - 10);
            
        }

        function update () {
             self.points.forEach(function (x) {
                 x[0] -= 2;
                 if (x[0] <= 0) {
                    x[0] = CANVAS_WIDTH;
                }
            });
        }

        this.animateBackground = function () {
            if (self.animationFrame % 200 === 0) {
            }

            self.animationFrame = requestAnimationFrame(self.animateBackground);
            update();
            draw();
        };

        this.drawBackground = function() {
            var w = canvas_element.width,
                h = canvas_element.height; 
            self.X = w / 2;
            self.Y = h / 2;
            self.Z = h / 2;
            draw();
        };
       
        this.cancelAnimationFrame = function () {
            cancelAnimationFrame(self.animationFrame);
            self.animationFrame = undefined;
            // console.log(self.animationFrame);
        };
    }

    
/* GAME OBJECTS
============================================================*/

/** 
* The 'player' object represents the main player in the game.
* 
*
* @class:       Player 
* @constructor:        {Object}
**/

    function Player() {
        var images = MEDIA.images;
        this.height = canvas_element ? canvas_element.height * 0.08 : CANVAS_HEIGHT * 0.08; //images.playerheight; //CANVAS_HEIGHT / 11.765;
        this.width = canvas_element ? canvas_element.width * 0.08 : CANVAS_WIDTH * 0.08; //images.playerwidth;   // CANVAS_WIDTH / 11.765;

        this.color = "#00A";
        this.x = 0;
        this.y = canvas_element ? canvas_element.height : CANVAS_HEIGHT;
        this.y -= this.height;
        this.prevX = this.x;
        this.prevY = this.y;

        this.lives = 3;
        this.points = 0;
        this.speed = 5;
        this.shots = 0;
        this.bullets = [];

        this.hits = 0;
        this.small_hits = 0;
        this.medium_hits = 0;
        this.big_hits = 0;

        this.active = true;
        this.image = images.playerimage;
        this.canshoot = true;
        this.imageType = images.playerimageType; 
    
         
                // alert(images.playerheight);
        
        this.init = function () {
             if (this.image === undefined) {
                  this.image = images.playerimage;
                  // console.log(player.image);
             }
        };

        this.draw = function () {
              if (this.active === false) {
                  if (this.lives === 0) {
                        //console.log("lives = 0");
                      return false;
                  }

                  this.bullets = [];
                  this.x = 0;
                  this.y = META_BAR_HEIGHT + 3;
                  this.active = true;
              } 

            // console.log("this.image = ");
            // console.log(MEDIA.images.images.playerimage);
            // console.log(this.image);
            canvas.clearRect(this.prevX, this.prevY, this.width, this.height);
            if (slowPerformance) {
                Draw.rect(canvas, this.x, this.y, this.height, this.width, this.color);
            } else {
                canvas.drawImage(this.image, this.x, this.y, this.width, this.height);
            }
            this.prevX = this.x;
            this.prevY = this.y;
            return true;
        };

        this.explode = function () {
            var instance = createjs.Sound.play("explosion");
            instance.setVolume(0.5);

            this.active = false;
            this.lives -= 1; 
            if (this.lives === 2) {
                this.points -= 200;
            } else if (this.lives === 1) {
                this.points -= 400;
            } else {
                this.points -= 400;
            }
        };

        this.midpoint = function () {
            return {
                x: this.x + this.width,
                y: this.y + this.height/2,
            };
        };

        this.shoot = function () {
            var bullet_position = this.midpoint(),
            instance = createjs.Sound.play("shoot");
            instance.setVolume(0.4);
            this.shots += 1; 
            this.bullets.push(playerBullet({
                speed: this.speed,
                x: bullet_position.x,
                y: bullet_position.y
            }));
        };
    }
// ====================================================================
/**
 playerBullet
*/
    function playerBullet (o) {

        var I = o || {};
        var width,
            height;
        width = canvas_element ? canvas_element.width : CANVAS_WIDTH;
        height = canvas_element ? canvas_element.height : CANVAS_HEIGHT;

        I.active = true;
        I.xVelocity = I.speed + width / 100;
        I.yVelocity = 0;
        I.width = 8;
        I.height = 5;
        I.color ="#FFFFFF";
        I.prevX = I.x;
        I.prevY = I.y;

        I.inBounds = function () {
            return I.x >= 0 && I.x <= width &&
                I.y >= 0 && I.y <= height;
        };

        I.draw = function () {
            canvas.clearRect(this.prevX, this.prevY, this.width, this.height);
            canvas.fillStyle = this.color;
            canvas.fillRect(this.x, this.y, this.width + width/ 100, this.height + width / 250);
            this.prevX = this.x;
            this.prevY = this.y;
            
        };

        I.update = function () {
            I.x += I.xVelocity;
            I.y += I.yVelocity;

            I.active = I.active && I.inBounds();
        };

        return I;
    }

/* enemyPlayer
================================================
*/
    function bigEnemyPlayer (i) {
        var I = i || {},
        key;
        var width = canvas_element ? canvas_element.width : CANVAS_WIDTH,
            height = canvas_element ? canvas_element.height : CANVAS_HEIGHT;

        I.type = "big";
        I.active = true;
        I.age = Math.floor(Math.random() * 128);
        I.color = "red";
        I.x = width; 
        I.y = height / 4 + Math.random() * CANVAS_HEIGHT / 2;

        I.prevX = I.x;
        I.prevY = I.y;

        I.xVelocity = - (width / 67);
        I.yVelocity = 0;
        I.width =  canvas_element? canvas_element.width *0.08 : CANVAS_WIDTH * 0.08; //MEDIA.images.enemywidth; //CANVAS_WIDTH / 11.765; //MEDIA.images.enemywidth; // CANVAS_WIDTH / 11.765;
        I.height = canvas_element? canvas_element.height * 0.08 : CANVAS_HEIGHT * 0.08; //MEDIA.images.enemyheight; //CANVAS_HEIGHT / 11.765;//  MEDIA.images.enemyheight; // CANVAS_HEIGHT / 11.765;
        I.points = 10;
        I.image = MEDIA.images.enemyimage;
        

        // methods
        I.draw = function (x1, y1, w1, h1) {
            var x = x1 || I.x,
            y = y1 || I.y,
            w = w1 || I.width,
            h = h1 || I.height;

            canvas.clearRect(this.prevX, this.prevY, this.width, this.height);
            if (slowPerformance) {
                Draw.rect(canvas, this.x, this.y, this.height, this.width, 'red');
            } else {
                canvas.drawImage(I.image, x, y, w, h);
            }
            this.prevX = this.x;
            this.prevY = this.y;
        };

        I.explode = function (col) {
            createjs.Sound.play("explosion");
            if (col === undefined) {
                I.active = false;
            }
        };
       
        I.inBounds = function () {
            return I.x >= 0 && I.x <= width &&
                I.y >= META_BAR_HEIGHT / 2  && I.y <= height;
        };

        I.update = function () {
            I.x += I.xVelocity;
            I.y += I.yVelocity;
            
            I.yVelocity = 3 * Math.sin(I.age * Math.PI / 64);
            
            I.age += 1;

            I.active = I.active && I.inBounds();
        };

        return I;
    }

    function mediumEnemyPlayer () {
        var player = bigEnemyPlayer();
        var width = canvas_element ? canvas_element.width : CANVAS_WIDTH,
            height = canvas_element ? canvas_element.height : CANVAS_HEIGHT;

    
        
        player.type = "medium";
        player.height = height / 17.64;
        player.width = width / 17.64;
        player.xVelocity = -width / 71;
        player.yVelocity = 0;
        player.points = 50;
        player.radius = 17;
        player.color = "orange";
        player.prevX = player.x;
        player.prevY = player.y;
        var PI = Math.PI;

        player.draw = function (x1, y1, r1) {
            var x = x1 || player.x,
            y = y1 || player.y,
            r = r1 || player.radius;

            //canvas.clearRect(this.prevX, this.prevY, 2*r, 2*r);
            canvas.beginPath();
            canvas.arc(x, y, r, 0, 2*PI, false);
            canvas.fillStyle = player.color;
            canvas.fill();
            player.prevX = player.x;
            player.prevY = player.y;
            // canvas.fillRect(player.x, player.y, player.width, player.height);
        };

        player.update = function () {
            player.x += player.xVelocity;
            player.y += player.yVelocity;
            player.active = player.active && player.inBounds();
            player.age += 1;
        };

        return player; 
    }

    function smallEnemyPlayer() {
        var player = mediumEnemyPlayer();
        var width = canvas_element ? canvas_element.width : CANVAS_WIDTH,
            height = canvas_element ? canvas_element.height : CANVAS_HEIGHT;

 
        player.type = "small";
        player.height = height / 23.530;
        player.width = width / 23.530;
        player.points = 250;
        player.color = "yellow";
        player.radius = 7;
        player.xVelocity = -width/ 53; 
        /*
        player.draw = function () {
            canvas.drawImage(player.image, I.x, I.y, I.width, I.height);
        }
        */
        return player;
    }
// ===============================================
    /**
    @constructor Game Constructor 
    */
    function Game() {
        // console.log("init game!");
        var self = this;
        // this.timestart = new Date().getTime();
        this.time = 0; 
        this.player = new Player(); //Object.create(player);
        this.player_bullets = [];
        this.enemies = [];
        this.timetotal = 0;
        this.background = {};
        this.background.x = 0;
        this.background.speed = 5;
        this.mediumenemyplayer = false;
        this.smallenemyplayer = false;

        this.total_enemies = 0;
        this.big_enemies = 0;
        this.small_enemies = 0;
        this.medium_enemies = 0;
        this.height = canvas_element.height;
        this.width = canvas_element.width;
       
        // console.log(this.player);
        this.startTime = function () {
            self.timestart = new Date().getTime();
        };

        this.pause = function () {
            canvas.drawImage(MEDIA.images.playicon, self.width / 2 - 50, (self.height/ 2) - 50, 100, 100);
            self.timetotal = self.time;
        };

        // update
        this.update = function () {
            var player = this.player;

             this.background.points.forEach(function (point) {
                point[0] -= self.background.speed;
                if (point[0] <= 0) {
                    point[0] = self.width;
                }
            });
            
            // player
            player.x = player.x.clamp(0, self.width - this.player.width);
            player.y = player.y.clamp(META_BAR_HEIGHT, self.width - this.player.height);

            // update bullets
            player.bullets.forEach(function (bullet) {
                bullet.update();
            });

            player.bullets = player.bullets.filter(function (bullet) {
                return bullet.active;
            });

            // Enemies
            this.enemies.forEach(function (enemy) {
                enemy.update();

                if (enemy.type === "medium") {
                    if (!enemy.active) {
                        // console.log("self.mediumplayer = false");
                        self.mediumenemyplayer = false;
                    } 
                } else if (enemy.type === "small") {
                   if (!enemy.active) {
                       // console.log("self.smallplayer = false");
                       self.smallenemyplayer = false;
                   } 
                }
            });

            this.enemies = this.enemies.filter(function (enemy) {
                return enemy.active;
            });

            
           
            var random = Math.random();
            if (random < 0.05) {
                this.enemies.push(bigEnemyPlayer());
                this.big_enemies += 1;
                this.total_enemies += 1;
            }

            if (random < 0.05 && !this.mediumenemyplayer) {
                // console.log("pushing mediumplayer!");
                this.enemies.push(mediumEnemyPlayer());
                this.mediumenemyplayer = true;
                this.medium_enemies += 1;
                this.total_enemies += 1;
   
            }

            if (random < 0.01 && !this.smallenemyplayer) {
                // console.log("pushing smallplayer!");
                this.enemies.push(smallEnemyPlayer());
                this.smallenemyplayer = true;
                this.small_enemies += 1;
                this.total_enemies += 1;
   
            }
            
            this.time = this.timetotal + new Date().getTime() - this.timestart; 

            // deal with collisions 
            this.handleCollisions();
            this.events.checkMove();
        };
    // end of function update 

        this.initBackground = function () {
            var points = this.background.points  = []; 

                var i = 0,
                num_points = 100,
                x, y, z;

                for (i; i < 100; i += 1) {
                    x = Math.floor(Math.random() * CANVAS_WIDTH);
                    y = Math.floor(Math.random() * CANVAS_HEIGHT);
                    z = (i % 3) + 1;
                    if (y < META_BAR_HEIGHT) {
                        y += META_BAR_HEIGHT;
                    }
                    points.push([x,y,z]);
                }
        };

        this.initBackground();

        this.drawBackground = function () {
            var i, 
            points = this.background.points, 
            l = points.length;

            canvas.fillStyle = "#000000";
            canvas.fillRect(0, 0, self.width, self.height);
            canvas.fillStyle = "#FFFFFF";

            for (i = 0; i < l; i += 1) {
                canvas.fillRect(points[i][0], points[i][1], points[i][2], points[i][2]);
            }

        };

        this.draw = function () {
            this.drawBackground();
            this.metabar();
            
            if (this.time >= GAME_TIME_LIMIT * 1000) {
                // console.log("time up, fool!");
                this.endGame(true);
                return this;
            }

            if (!this.player.draw()) {
                this.endGame();
                return this;
            }

            this.player.bullets.forEach(function (bullet) {
                bullet.draw();
            });

            this.enemies.forEach(function (enemy) {
                enemy.draw();
            });
        };
        
        this.setAnimationFrame = function (animationframe) {
            this.animationframe = animationframe;
        };

        this.endGame = function (winner) {
            // console.log("End Game");
            var summary;
            // toggleflag = false;
           
            // body.onkeyup = null;
            // stop the animation
            WTFBlaster.stop();

            // if the player has made it to the alloted time
            // then they have at least "finished the game"
            // otherwise, their score is not recorded
            if (winner) {
                summary = self.winnersummary;
               //  toggleflag = true; 
            } else {
                summary = self.losersummary;
            }

            this.cleanup(summary);
        };

        this.cleanup = function (callback) {
            // console.log
            // console.log("in cleanup and "); 
            canvas_element.onclick = null;
            // this.pause();
            this.player.bullets = [];
            this.enemies = [];
            // canvas.drawImage(MEDIA.images["explosionimg"], this.player.x, this.player.y, this.player.width, this.player.height);
            setTimeout( function (t) {
                // cancelAnimationFrame(t[0]);
                //console.log("in setTimeout");
                canvas.clearRect(0, 0, self.width, self.heigh);
                t[1]();
            }, 1000, [self.animationframe, callback]);
        }; 

        this.winnersummary = function () {
        //console.log("windders");
            var w = canvas_element.width,
                h = canvas_element.height,
                font_size = w / 20,
            percent;

            canvas.fillStyle = "#000000";
            canvas.fillRect(0, 0, w, h);
            canvas.fillStyle= "#FFFFFF";
            canvas.textAlign = "center";
            canvas.font = 2*font_size + "px verdana";
            canvas.fillText("Good job! You finished!", w/2, (3/2)*font_size);

            // self.summary();

            if (self.player.shots === 0) {
                 percent = 0;
            } else {
                percent = self.player.hits / self.player.shots;
            }

            // percent = percent.toPrecision(2);

            var score = self.player.points * percent;
            score = score.toPrecision(5);

            percent = percent.toPrecision(2);
   
            WTFBlaster.setData({
                "points": self.player.points, 
                "big_hits": self.player.big_hits,
                "medium_hits": self.player.medium_hits,
                "small_hits": self.player.small_hits,
                "total_enemies": self.total_enemies,
                "small_enemies": self.small_enemies,
                "medium_enemies": self.medium_enemies,
                "big_enemies": self.big_enemies,
                "hits": self.player.hits,
                "shots": self.player.shots, 
                "imagetype": self.player.imageType,
                "score": score
            });

            $('.game-summary').html(modal_template({
                "points": self.player.points, 
                "hits": self.player.hits,
                "shots": self.player.shots, 
                "percentage": percent + "%", 
                "score": score}));
           
            // console.log("going to call showModal");
            // $('#enterNameModal').modal(); 
            showModal();

            // S.toggle();
         // this frame is paused on the screen. Now need

        };

        this.losersummary = function () {
            // console.log("looooser");
            var font_size = self.width / 20;
                canvas.fillStyle = "#000000";
                canvas.fillRect(0, 0, self.width, self.height);
                canvas.fillStyle= "#FFFFFF";
                canvas.textAlign = "center";

                canvas.font = 2*font_size + "px verdana";
                canvas.fillText("Game Over", self.width / 2, font_size + 20); 
                self.summary();
        };

        this.summary = function () {
            var w = canvas_element.width,
                h = canvas_element.height,
                font_size = canvas_element.width / 20,
                percent;
 
            canvas.font = font_size + "px verdana";
            canvas.fillText("Points: " + this.player.points, w/2, h/2 - 3 * font_size); 

            canvas.fillText("Hits:   " + this.player.hits, w/2, h/2 - 2*font_size); 
                
            canvas.fillText("Shots:  " + this.player.shots, w/2, h/2 - 1* font_size); 

            if (this.player.shots === 0) {
                percent = 0;
            } else {
                percent = this.player.hits / this.player.shots;
            }
            // console.log("percent = " + percent); 
            canvas.fillText("%: " + (percent).toPrecision(2), w/2, h/2 + 3* font_size); 

            setTimeout(function () {
                 // player.lives = 3;
                WTFBlaster.reset();
            }, 3000);
           
        };

        this.metabar = function () {
            // META-BAR
            // score
            var w = (canvas_element && canvas_element.width) ? canvas_element.height : CANVAS_WIDTH;
            var font_size = (canvas_element ? canvas_element.height : CANAS_HEIGHT) * 0.0425; 
            // player lives
            var l = this.player.lives,
            i = 0,
            s = font_size - font_size / 4,
            r = (3/2)*s; 

            for (i; i < l; i += 1) {
                if (slowPerformance) {
                    Draw.rect(canvas, i * r + 3, 5, r, s, this.player.color);
                } else {
                    canvas.drawImage(this.player.image, i * r + 3, 5, r, s); 
                }
            }
            canvas.font = font_size + "px Verdana";
            canvas.fillText("POINTS: " + this.player.points, w / 3.0, font_size);
            canvas.fillText('SHOTS: ' + this.player.shots, w / 1.5, font_size);
            canvas.fillText('HITS: ' + this.player.hits, w / 1.0, font_size);
            canvas.fillText(this.formatTime(this.time), w / 0.75, font_size);
        };

        this.formatTime = function (time) {
            var mins, secs, milli;
            secs = time / 1000;
            // milli = (time - secs*1000).toFixed(2);
            mins  = Math.floor(secs / 60);

            secs = (secs - (mins * 60)).toFixed(2);
            if (secs < 10) {
                secs = '0' + secs;
            } 

            if (mins === 0) {
                mins = '';
            }
            if (mins !== '') {
                return mins + ":" + secs;
            } else {
                return secs;
            }

        };

        this.collides = function (a, b) {
            return a.x < b.x + b.width &&
                a.x + a.width > b.x &&
                a.y < b.y + b.height &&
                a.y + a.height > b.y;
        };

        this.handleCollisions = function () {
            var player = self.player;

            player.bullets.forEach(function (bullet) {

                self.enemies.forEach(function (enemy) {

                    if (self.collides(bullet, enemy)) {

                        player.points += enemy.points;

                        if (enemy.type === "big") {
                            player.big_hits += 1;
                        } else if (enemy.type === "medium") {
                            player.medium_hits += 1;
                        } else {
                            // small enemy player
                            player.small_hits += 1;
                        }

                        player.hits += 1;
                        enemy.explode();
                        bullet.active = false;
                    }
                });
        });

        this.enemies.forEach(function (enemy) {
            if (self.collides(enemy, self.player)) {
                    enemy.explosion = true;
                    self.player.explode();
                }
            });
        };


        this.events = { 
            allkeys: {
                106: false,
                74: false,
                107: false,
                75: false,
                76: false,
                // left
                104: false,
                72: false, 
                108: false,
                70: false,
                102: false,
                // left,
                37: false,
                // up 38,
                38: false,
                // right 
                39: false,
                // down,
                40: false,
                
                // shoot,
                32: false,
            },

            movekeys : {
                106: ['y', '+'],
                74: ['y', '+'],
                107: ['y', '-'],
                75: ['y', '-'],
                108: ['x', '+'],
                76: ['x', '+'],
                104: ['x', '-'],
                72: ['x', '-'],
                37: ['x', '-'],
                38: ['y', '-'],
                39: ['x', '+'],
                40: ['y', '+']
            },
            
            shootkeys : {
                102: false,
                70: false,
                32: false
            },
           
            handler: function (target) {
                    var type = target.type;
                    // console.log(target.srcElement.id);
                    if (type === undefined) {
                        throw {
                            "name": "CodeError",
                            "message": "No key code available"
                        };
                    }

                    if (type === 'keyup') { 
                        self.events.keyup(target);
                    } else {
                        self.events.keydown(target);
                    }
               
            },

            keydown: function ( target ) {
                var code = target.keyCode,
                allkeys = this.allkeys;

                if (target) {
                    target.preventDefault();
                }
                if (allkeys.hasOwnProperty(code)) {
                    allkeys[code] = true;
                }
            },

            keyup: function ( target ) {
                var key = target.keyCode,
                allkeys = this.allkeys;

                if (allkeys.hasOwnProperty(key)) {
                    allkeys[key] = false;
                    if (key === 70 || key === 32) {
                        self.player.canshoot = true;
                    }
                }
            },

            movePlayer : function ( args ) {
                var dim = args[0],
                sign = args[1],
                MOVE = CANVAS_WIDTH / 80;

                if (sign === '-' || sign === 'sub' || sign === 'subtract') {
                    self.player[dim] -= MOVE;
                } else {
                    self.player[dim] += MOVE;
                }

            },

            checkMove : function () {
                var key,
                movekeys = this.movekeys,
                player = self.player;
               
                for ( key in this.allkeys ) {
                    if ( this.allkeys[key] ) {
                        if ( movekeys.hasOwnProperty(key) ) {
                            this.movePlayer(movekeys[key]);
                        } else {
                             if ( player.canshoot ) {
                                // console.log("canshoot!");
                                player.shoot();
                                player.canshoot = false;
                             }
                        }
                    }
                }
            }
        };

        body.onkeydown = this.events.handler;
        body.onkeyup = this.events.handler; 
    } // end of Game construtor

       function displayResults(data, status, jqXHR) {
            var titleFlag = false;
            if (data.empty) {
                $('#game-results').html("<h3 class='ital text-center'>" + data.msg + "</h3>");

                // $('#topten').html("<span class='ital'>None</span>");

                // return false;
            }
            else {
                data.quizzes.forEach(function (val, ind, arr) {
                    val.rank = ind + 1;
                });

                if (data.quizzes.length > 0) 
                    $('#game-results').html(results_template(data.quizzes));
            }

            if (data.ten) {
                data.topten.forEach(function (val, ind, arr) {
                    val.rank = ind + 1;
                });

                if (data.topten.length > 0)
                    $('#topten').html(topten_template(data.topten));

                titleFlag = true;
            }

            if (!data.empty && data.ten) 
                // TODO: output this to a div in the browser
                drawTitleCanvas({"today": data.quizzes[0], "alltime": data.topten[0]});

            //console.log("in display results");
       }
   
        function drawPointCanvas() {
            var points_context = points_canvas.getContext('2d'),
                sp = smallEnemyPlayer(),
                mp = mediumEnemyPlayer(),
                lp = bigEnemyPlayer(),
                player = new Player();
               

            // console.log(points_canvas.width);
            // console.log(lp.height);
            var textsize = 15,
            textX = 190;
            points_context.fillStyle = "#fff";
            points_context.fillRect(0, 0, points_canvas.width, points_canvas.height);

            Draw.text(points_context, 'You', 30, 20, 17, 'black');
            Draw.text(points_context, 'Adversaries', 120, 20, 17, 'black');
        
            if (slowPerformance) {

                Draw.rect(points_context, 20, 25, player.width, player.height, player.color); 
                Draw.rect(points_context, 110, 25, player.width, player.height, lp.color); 

            } else {
                points_context.drawImage(player.image, 30, 25, player.width / 2, player.height / 2); 

                points_context.drawImage(lp.image, 145, 25, player.width / 2, player.height / 2); 
            }

            Draw.text(points_context, '3 lives', 20, 50 + player.height / 2, 20, 'black');

            Draw.text(points_context, '(1) -200 points', 10, 70 + player.height / 2, 13, 'black');

            Draw.text(points_context, '(2) -400 points', 10, 85 + player.height / 2, 13, 'black');

            Draw.text(points_context, '(3) Game Over', 10, 100 + player.height / 2, 13, 'black');

           
            Draw.text(points_context, lp.points + ' points', textX, 45, textsize, 'black');
       
            points_context.beginPath();
            points_context.arc(160, 95, mp.radius, 2*Math.PI, false); 
            points_context.fillStyle = mp.color;
            points_context.fill();
            
            Draw.text(points_context,  mp.points + ' points', textX, 100, textsize, 'black');

            points_context.beginPath();
            points_context.arc(160, 125 + sp.radius, sp.radius, 2*Math.PI, false); 
            points_context.fillStyle = sp.color;
            points_context.fill();

            Draw.text(points_context,  sp.points + ' points', textX, 130 + sp.radius, textsize, 'black');
        }

        var Draw = {
            text: function (context, string, x, y, size, col) {
                context.font = 'bold ' + size + 'px Monospace';
                context.fillStyle = col;
                context.fillText(string, x, y);
            },

            rect: function (context, x, y, w, h, col) {
                var prevcol = context.fillStyle;
                context.fillStyle = col;
                context.fillRect(x, y, w, h);
                context.fillStyle = prevcol;
            }
        };

        function drawTitleCanvas(number_ones) {
            if (title_canvas === null) return;

            var title_context = title_canvas.getContext('2d'),
            title = 'WTFBlaster',
            parwid = $('#title-canvas').width(),
            //parhei = $('#title-canvas
            parhei = Math.min(parwid / 4, 150);
            $('#title-canvas').height(parhei);
            title_canvas.width = parwid;
            title_canvas.height = parhei;
          
            var i = 0,
            num_points = 100,
            x, y, points = [], z;
        
            for (i; i < 100; i += 1) {
                x = Math.floor(Math.random() * parwid);
                y = Math.floor(Math.random() * parhei);
                z = (i % 3) + 1;
                points.push([x,y,z]);
            }

            title_context.fillStyle = "#000000";
            title_context.fillRect(0, 0, parwid, parhei);
            title_context.fillStyle = "#FFFFFF";

            for (i = 0; i < num_points; i += 1) {
                title_context.fillRect(points[i][0], points[i][1], points[i][2], points[i][2]);
            }

            title_context.shadowBlur = 30;
            title_context.shadowColor = "red";
       
            title_context.fillStyle = "#000000";
            title_context.textAlign = "center";
            title_context.textBaseline = "middle";
            
            Draw.text(title_context, title, parwid / 2, parhei / 2, parhei / 2, "white");

            var str1 = 'Today: ',
            str2 = "Alltime: ";

           /*if (number_ones) {
                var today = number_ones.today,
                alltime = number_ones.alltime;

                if (today) { 
                    str1 += today.name + '  ' +  today.score + " " + today.time;
                    //Draw.rect(title_context, 10, 7, 470, 25, "white");
                    Draw.text(title_context, str1, parhei, parhei / 10, parhei /10, "white");
                }

                if (alltime) {
                    str2 += alltime.name + ' ' + alltime.score + " " + alltime.date;
                    //Draw.rect(title_context, parwid - 490, 7, 485, 25, "white");
                    //
                    Draw.text(title_context, str2, parhei, parhei - (parhei/10), parhei / 10, "white");
                    //Draw.text(title_context, str2, parwid - (CANVAS_WIDTH / (12 / 7)), title_canvas.height - (CANVAS_WIDTH/30), CANVAS_HEIGHT/ 30, "white");
                }
            }*/
       
            title_context.shadowBlur = 0;
        }

        function drawCanvases() {
            drawPointCanvas();
        }


        function changeImages(data) {
            var value = data.currentTarget.value;
             var pImage, eImage, width, height,
             type,
             self = MEDIA.images;

             if (value === "packers") {
                pImage = self.packersimage;
                eImage = self.bearsimage;
                width = CANVAS_WIDTH / 11.765;
                height = CANVAS_HEIGHT / 11.765;
                type = "packers";
             } else {
                width = 50;
                height = 50;
                type = "rectangle";
                slowPerformance = true;
             }

             if (value === "noimage") {
               height = CANVAS_WIDTH / 13;
                width = CANVAS_WIDTH / 15;
             }
             self.enemyheight = height;
             self.enemywidth = width; 
         
             self.playerimage = pImage;
             self.enemyimage = eImage;
             self.playerimage = pImage;
             self.playerimageType = type;
             self.playerwidth = width;
             self.playerheight = height;
             drawPointCanvas();
        }

        function showModal() {
            
            $('#enterNameModal').modal();
        }

        // Personal bests, kept in this browser only (there's no score server any more).
        // The shape matches what the old server's /add endpoint returned, so
        // displayResults() works unchanged.
        var BESTS_KEY = 'appbep-wtfblaster-bests';

        function loadBests() {
            try {
                return JSON.parse(localStorage.getItem(BESTS_KEY)) || [];
            } catch (e) {
                return [];
            }
        }

        function saveBest(game) {
            var bests = loadBests();
            bests.push(game);
            bests.sort(function (a, b) { return b.score - a.score; });
            try {
                localStorage.setItem(BESTS_KEY, JSON.stringify(bests.slice(0, 50)));
                return true;
            } catch (e) {
                return false;
            }
        }

        function personalResults() {
            var bests = loadBests(),
                today = new Date().toDateString(),
                todays = bests.filter(function (g) { return g.day === today; }).slice(0, 10);

            return {
                empty: todays.length === 0,
                msg: bests.length === 0 ? "No saved games yet. Last all 30 seconds to save one!" : "No saved games today.",
                quizzes: todays,
                ten: bests.length > 0,
                topten: bests.slice(0, 10)
            };
        }
    // GAME LOOP
    /**


    **/
    function Controller() {
        var animationFrame,
            game,
            FPS = 30,
            buttons = ["start", "pause", "stop"],
            self = this,
            gameData;

            function draw () {
                  animationFrame = requestAnimationFrame(draw);
                  game.update();
                  game.draw();
            }

            
            this.toggle = function (callback) {
               if (game === undefined) {
                    canvas.shadowBlur = 0;
                    self.start();
                } else {
                }

                if (animationFrame === undefined) {
                    // starting or re-starting
                    game.startTime();
                    requestAnimationFrame(draw);
                } else {
                    // pause
                    game.pause();
                    cancelAnimationFrame(animationFrame);
                    animationFrame = undefined;
                }
           };

           this.start = function () {
               $(':input').unbind('change');

               if (typeof introScreen !== 'undefined' ) {
                    // introScreen.cancelAnimationFrame();
                    introScreen = undefined;
               }
               game = new Game();
           };

           this.reset = function () {
                if (game) {
                    game = undefined;
                }

                canvas_element.onclick = self.toggle;
                if(introScreen)
                    introScreen.drawBackground();
                else
                    startIntro();

           };

           this.stop = function () {
                body.onkeydown = function(e) {
                    if (e.keyCode === 32 || e.keyCode === 38 || e.keyCode === 40)
                        e.preventDefault();
                };
                if (animationFrame > 0) {
                     cancelAnimationFrame(animationFrame);
                     animationFrame = undefined;
                }
                
                if (introScreen) introScreen = undefined;
           
                $('.radio input').bind('change', function (data) {
                    changeImages(data);
                });
           };

           this.exit = function () {

               if (game) {
                    self.stop();
                    game = undefined; 
                    cancelAnimationFrame(animationFrame);
                    animationFrame = undefined;
               }

               startIntro();

               $('.radio input').bind('change', function (data) {
                    changeImages(data);
                });

           };

           this.checkName = function () {
                // No names any more: saving goes straight to this browser.
                self.sendServer();
           };

           this.setData = function (data) {
                gameData = data;
           };

           this.sendServer = function () {
                var now = new Date(),
                    percent = gameData.shots ? gameData.hits / gameData.shots : 0;

                var saved = saveBest({
                    score: Number(gameData.score),
                    points: gameData.points,
                    percentage: Math.round(percent * 100) + '%',
                    time: now.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}),
                    date: now.toLocaleDateString(),
                    day: now.toDateString()
                });

                if (!saved) {
                    $('.sending').css({'color': 'red'}).text("Couldn't save: this browser is blocking storage.");
                    return;
                }

                $('.sending').text("Saved to your personal bests!");
                displayResults(personalResults());

                setTimeout(function () {
                    $('#enterNameModal').modal('hide');
                    $('.sending').text('').css({'color': 'black'});
                    $('.game-summary').html('');
                }, 1200);
           };
           $('.modal-body').click(function() {
               $('.sending').text('');
           });

           stop_button.onclick = self.exit;
           function startIntro() {
                // console.log("in start Intro!");
               introScreen = new IntroScreen(); 
               introScreen.drawBackground();
               //introScreen.animateBackground(); 
           }

           resize();
           introScreen = new IntroScreen();
           introScreen.drawBackground();
           canvas_element.onclick = self.toggle;
       } // Controller 
       
       function resizeTable() {
           var tfs,
               MIN = 12;

           // Added 2026: with no tables on the page (no saved games yet), the loop below
           // read the font size of nothing and threw.
           if ($('.table').length === 0) return;

           $('.table').css({'font-size': "17px"});
           
           if ($('.table').parent().width() < 400) {   
               while ($('.table').width() > $('.table').parent().width() - 10) {
                   tfs = parseInt($('.table').css('font-size').split("px")[0], 10);
                   tfs -= 1;

                   $('.table').css({'font-size': tfs + "px"});
                   if (tfs <= MIN) break;
               }
           }
       }

        function resize() {
            var par = game_canvas_wrapper,
                parwid = par.width(),
                parheight = par.height(),
                currentWidth = canvas_element.width,
                currentHeight = canvas_element.height;

                var scale = CANVAS_WIDTH / CANVAS_HEIGHT;

                if (parwid < CANVAS_WIDTH && parwid > 300) {
                    currentWidth = 0.95*parwid;
                    currentHeight = (1/scale)*currentWidth;
                }
   
                canvas_element.width = currentWidth;
                canvas_element.height = currentHeight;
                canvas_element.style.border = "10px solid #8B0000";
                canvas_element.style.backgroundColor = "black";
                canvas_element.style.position= "relative";
                canvas_element.style.marginLeft = "auto";
                canvas_element.style.marginRight= "auto";
                if (introScreen) introScreen.drawBackground();
        }
        /**
        @event          load 
        **/
        window.addEventListener('load', function () {
            var currentHeight = CANVAS_HEIGHT,
            currentWidth = CANVAS_WIDTH,
            availWidth = screen.availWidth;

            if (availWidth < 480) {
                currentWidth = 460;
                currentHeight = (currentWidth / CANVAS_WIDTH) * CANVAS_HEIGHT;
            }

            

            modal_template = Handlebars.compile($('#modal_template').html());
            results_template = Handlebars.compile($('#results_template').html());

            topten_template = Handlebars.compile($('#topten_template').html());
 

            $('#cancel_add_name').click(function () {
                $('.sending').text('').css({'color': 'black'});
                $('.game-summary').html('');
            });

            $('.modal-btn').click(function () {
                WTFBlaster.reset();
            }); 

            $('#send_game_server').click(function () {
                WTFBlaster.checkName();
            });

            currentWidth = window.innerWidth;
            currentHeight = window.innerHeight;
            canvas_element = document.createElement('canvas');


            // canvas_element = document.getElementById('game-canvas');

            title_canvas = document.getElementById('title-canvas');
            
            points_canvas = document.getElementById('points-canvas');

            body = document.getElementsByTagName('body')[0];

            main_content = document.getElementById('main-content');

            stop_button = document.getElementById('stop-button');

            send_game_server = document.getElementById('send_game_server');

            enter_name = document.getElementById('entername');

            canvas = canvas_element.getContext('2d');
            canvas_element.setAttribute('width', currentWidth + "px");
            canvas_element.setAttribute('height', currentHeight + "px");
            canvas_element.width = CANVAS_WIDTH;
            canvas_element.height = CANVAS_HEIGHT;
            canvas_element.style.display = "block";
            canvas_element.style.position = "relative";
            canvas_element.style.marginRight = "auto";
            canvas_element.style.marginLeft = "auto";
            // canvas_element.style.border = "10px solid #8B0000";
            points_canvas.style.border = "1px solid black";
            points_canvas.width= "300";

            // set game canvas_wrapper element
            // remove first child
            // append canvas_element
            game_canvas_wrapper = $('#game_canvas_wrapper');   

            var gcw = document.getElementById('game_canvas_wrapper');
            //gcw.remove(gcw.firstChild.nextSibling);
            gcw.firstChild.nextSibling.remove();
            gcw.appendChild(canvas_element);

            $('#tooltip').tooltip();

            MEDIA.images.init(drawCanvases);

            MEDIA.sound.init();
            
            displayResults(personalResults());
            resizeTable();
            drawTitleCanvas();
            $(window).resize(function() {
                drawTitleCanvas();
                resize();
            });

            $('.game-duration').text(GAME_TIME_LIMIT);

      }, false);

      function startGame() {
            // console.log('initializing controller...');
            WTFBlaster = new Controller();
            // WTFBlaster.startIntro();
      }

      // console.log("in wtfblaster.js");

}(this));

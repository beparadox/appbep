/*
 * Restored for appbep.com (2026). Changes from the original:
 *  - Input listens on the canvas only, with pointer events. The original listened for click
 *    AND touchstart on the whole window, so a phone tap counted twice and links on the page
 *    couldn't be tapped.
 *  - Tap position comes from getBoundingClientRect(), and the canvas is scaled with CSS
 *    (see index.html). resize() sized the game from the window's height, so on a phone held
 *    upright it was wider than the screen. resize() is left below, unused, for the record.
 *  - Removed two console.log calls.
 * Everything else is as written in 2014, quirks included: the splash-screen loop keeps
 * running after the game starts, so everything moves at double speed. That's the speed
 * the game was tuned at, so it stays.
 */
/*
==============================================================================
Based on the tutorial found at:

http://www.smashingmagazine.com/2012/10/19/design-your-own-mobile-game/
by Eoin McGrath. Thanks Eoin!


@author:    Bambridge E. Peterson 
@date:      April, 2014

==============================================================================
*/

(function (window) {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];

    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] ||
            window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
 
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }

    /**
    @module     POP
    **/
    var POP = {
        WIDTH: 320,

        HEIGHT: 480,

        RATIO:  null,

        currentWidth: null,

        currentHeight: null,

        canvas: null,

        context: null,

        entities: [], 

        scale:  1,

        offset: {top: 0, left: 0},

        nextBubble: 100,

        nextFish: 200,

        playing: false,

        styles: {
            bubblecolor: "#FFF",

            skycolor: "#6698FF",

            watercolor: "#0000FF",

            textcolor: "#FFF"
        },

        init: function () {
            POP.RATIO = POP.WIDTH / POP.HEIGHT;

            // set current width
            POP.currentWidth = POP.WIDTH;

            POP.currentHeight = POP.HEIGHT;

            POP.canvas = document.getElementsByTagName('canvas')[0];

            POP.canvas.width = POP.WIDTH;

            POP.canvas.height= POP.HEIGHT;

            POP.context = POP.canvas.getContext('2d');

            POP.ua = navigator.userAgent.toLowerCase();

            POP.android = POP.ua.indexOf('android') > -1 ? true: false;

            POP.ios = (POP.ua.indexOf('iphone') > -1 || POP.ua.indexOf('ipad') > -1 ) ? true: false;

            POP.wave = {
                x: -25,
                y: 20,
                r: 70,
                time: 0,
                offset: 0,
            };

            POP.wave.total = Math.ceil(POP.WIDTH / POP.wave.r) + 1;

            
            // One pointer event covers mouse, touch and pen, and fires once per tap.
            POP.canvas.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                POP.Input.set(e);

                if ( !POP.playing ) {
                    POP.start();    
                }
            }, false);

            // POP.loop();
            POP.splashScreen();
        }, // end of init

        start: function () {
           var ent = POP.entities.pop();
            POP.splash = false; 
            POP.loop();
            POP.playing = true;
        },

        stop: function () {
            cancelAnimationFrame();
            POP.playing = false;
        },

        splashScreen: function () {

            function update() {
                var i, l = POP.entities.length;

                for (i = 0; i < l; i += 1) {
                    POP.entities[i].update();
                }

                POP.wave.time = new Date().getTime() * 0.002;
                POP.wave.offset = Math.sin(POP.wave.time * 0.8) * 5;
            }


            function draw()  { 
                POP.Draw.rect(0, 0, POP.WIDTH, POP.HEIGHT, POP.styles.watercolor);
                POP.Draw.text("Welcome to POPFishies!", 30, POP.HEIGHT / 2, 20, "white");

                POP.Draw.text("Click to start", 100, POP.HEIGHT / 2 + 16, 13, "white");

                for (i = 0; i < POP.wave.total; i += 1) {
                    POP.Draw.circle(
                        POP.wave.x + POP.wave.offset + (i* POP.wave.r) + 5,
                        POP.wave.y,
                        POP.wave.r,
                        POP.styles.skycolor);
                }

                var i, l = POP.entities.length;

                for (i = 0; i < l; i += 1) {
                    POP.entities[i].draw();
                }

                POP.Draw.sun();
            }

            function loop() {
                requestAnimationFrame(loop);
                update();
                draw();
            }
            POP.splash = true; 
            POP.entities.push(new POP.Fish('red', true));
            loop();

        },

        fishcolors: [
            'red',

            'green',

            'orange',

            'yellow',

            'purple',

            'green',
            
            'yellow'
        ],

        update: function () {
            var i, l,
            checkCollision = false,
            hit;

            POP.nextBubble -= 1;
            if (POP.nextBubble < 0) {
                POP.entities.push(new POP.Bubble());
                POP.score.totalentities += 1;

                POP.nextBubble = (Math.random() * 100) + 100;
            }

            POP.nextFish -= 1;
            if (POP.nextFish < 0) {
                POP.entities.push(new POP.Fish('red'));
                POP.score.totalentities += 1;

                if (Math.random() < 0.40) {
                    var j,
                    counter = 0;

                    var fish = function() {
                        counter += 1;
                        if (counter === 7) return;

                        POP.entities.push(new POP.Fish(POP.fishcolors[Math.round(Math.random() * 7)] || 'red'));
                        
                        POP.score.totalentities += 1;

                        setTimeout(function () {
                            fish();
                        }, 200);
                    };

                    fish();
                }
                POP.nextFish = (Math.random() * 100) + 200;
            }

            // Spawn a new instance of Touch
            // if the user has tapped the screen
            if (POP.Input.tapped) {
                POP.score.taps += 1;
                POP.entities.push(new POP.Touch(POP.Input.x, POP.Input.y));

                // set tapped back to false;
                // to avoid spawning a new touch
                // in the next cycle
                POP.Input.tapped = false;
                checkCollision = true;
            }

            POP.wave.time = new Date().getTime() * 0.002;
            POP.wave.offset = Math.sin(POP.wave.time * 0.8) * 5;

            // l = POP.entities.length;
            // console.log("l = " + l);
            for (i = 0; i < POP.entities.length; i += 1) { 
                POP.entities[i].update();

                if (  POP.entities[i].type === 'bubble' && checkCollision) {
                    hit = POP.collides(POP.entities[i], 
                                {x: POP.Input.x, y: POP.Input.y, r: 7});

                    if (hit) {
                        POP.score.bubbles.hits += 1;
                        POP.score.bubbles.points += POP.entities[i].points;
                        for(var n = 0; n < 5; n += 1) {
                            POP.entities.push(new POP.Particle(
                                POP.entities[i].x,
                                POP.entities[i].y,
                                2,
                                'rgba(255,255,255,' + Math.random()*1 + ')'
                            ));
                        }
                    }

                    POP.entities[i].remove = hit;
                }

                if (POP.entities[i].type ==='fish' && checkCollision) {
                    hit = POP.collides(POP.entities[i], 
                         {x: POP.Input.x, y: POP.Input.y, r: 27});

                    if (hit) {
                        POP.score.fish.hits += 1;
                        POP.score.fish.points += POP.entities[i].points;
                        POP.entities[i].flipped = true;
                    }

                    // POP.entities[i].remove = hit;
           
                }

                POP.score.totalaccuracy = ((POP.score.bubbles.hits + POP.score.fish.hits) / (POP.score.bubbles.hits + POP.score.fish.hits + POP.score.fish.escaped + POP.score.bubbles.escaped)) * 100;
                
                POP.score.totalaccuracy = isNaN(POP.score.totalaccuracy) ? 0 : Math.round(POP.score.totalaccuracy);
                POP.score.totalpoints = (POP.score.bubbles.points + POP.score.fish.points);

                if (POP.entities[i].remove) {
                    POP.entities.splice(i, 1);
                }
            }
        }, // end of POP.update()

        draw: function () {
            // POP.Draw.clear();
            // POP.Draw.circle(20, 20, 40, "red");
            var i,
            l = POP.entities.length;

            POP.Draw.rect(0, 0, POP.WIDTH, POP.HEIGHT, POP.styles.watercolor);
            for (i = 0; i < l; i += 1) {
                POP.entities[i].draw();
            }

            for (i = 0; i < POP.wave.total; i += 1) {

                POP.Draw.circle(
                    POP.wave.x + POP.wave.offset + (i* POP.wave.r) + 5,
                    POP.wave.y,
                    POP.wave.r,
                    POP.styles.skycolor);
            }

            var left1 = 10,
            left2 = 100,
            size = 12,
            top1 = 10, 
            dis = 16;


            POP.Draw.text('Bubbles: ' + POP.score.bubbles.hits, left1, top1, size, POP.styles.textcolor);

            POP.Draw.text('Escaped: ' + POP.score.bubbles.escaped, left1, top1 + dis, size, POP.styles.textcolor);
         
            POP.Draw.text('Points: ' + POP.score.bubbles.points, left1, top1 + 2*dis, size, POP.styles.textcolor); 

            POP.Draw.text('Fish: ' + POP.score.fish.hits, left2, top1, size, POP.styles.textcolor);

            POP.Draw.text('Escaped: ' + POP.score.fish.escaped, left2, top1 + dis, size, POP.styles.textcolor);

            POP.Draw.text('Points: ' + POP.score.fish.points, left2, top1 + 2*dis, size, POP.styles.textcolor); 

            POP.Draw.text('Total Points: ' + POP.score.totalpoints, left1, top1 + 3*dis, size, POP.styles.textcolor); 

            POP.Draw.text('Total Accuracy: ' + POP.score.totalaccuracy + '%', left1, top1 + 4*dis, size, POP.styles.textcolor); 
             
            POP.Draw.sun();
        },

        loop: function () {
            requestAnimationFrame( POP.loop );
            POP.update();
            POP.draw();
        },

 
        resize: function () {
            POP.currentHeight = window.innerHeight;

            POP.currentWidth = POP.currentHeight * POP.RATIO;

            if (POP.android || POP.ios) {
                document.body.style.height = (window.innerHeight + 50) + 'px';
            }

            POP.canvas.style.width = POP.currentWidth + 'px';
            POP.canvas.style.height = POP.currentHeight + 'px';

            POP.scale = POP.currentWidth / POP.WIDTH;

            POP.offset.top = POP.canvas.offsetTop;
            POP.offset.left = POP.canvas.offsetLeft;


            window.setTimeout(function () {
                window.scrollTo(0, 1);
            }, 1);
        },

        }; // end of POP

        POP.score = {
            taps: 0,
            fish: {
                hits: 0,
                escaped: 0,
                points: 0
            },
            bubbles: { 
                hits: 0,
                escaped: 0,
                points: 0
            },
            totalaccuracy: 0,
            totalentities: 0,
            totalpoints: 0
        };

        POP.Input = {
            x: 0,

            y: 0,

            tapped: false,

            set: function (data) {
                // Map the tap from screen pixels to the 320x480 game coordinates.
                var rect = POP.canvas.getBoundingClientRect();

                this.x = (data.clientX - rect.left) * (POP.WIDTH / rect.width);
                this.y = (data.clientY - rect.top) * (POP.HEIGHT / rect.height);

                this.tapped = true;

                POP.Draw.circle(this.x, this.y, 10, 'red');

            }
        };


        window.addEventListener('load', POP.init, false);

        POP.Draw = {
            clear:  function () {
                POP.context.clearRect(0, 0, POP.WIDTH, POP.HEIGHT);
            },

            rect:   function (x, y, w, h, col) {

                var prev = POP.context.fillStyle;
                POP.context.fillStyle = col;
                POP.context.fillRect(x, y, w, h);
                POP.context.fillStyle = prev;
            },

            circle: function (x, y, r, col) {
                var prev;
                prev = POP.context.fillStyle;
                POP.context.fillStyle = col;
                POP.context.beginPath();
                POP.context.arc(x + 5, y + 5, r, 0, Math.PI * 2, true);
                POP.context.closePath();
                POP.context.fill();
                POP.context.fillStyle = prev;
            },

            text: function (string, x, y, size, col) {
                var prev;
                prev = POP.context.fillStyle;
                //POP.context.font = 'bold' + size + 'px Monospace';

                POP.context.font = 'bold ' + size + 'px Monospace';
                POP.context.fillStyle = col;
                POP.context.fillText(string, x, y);
                POP.context.fillStyle = prev;
            },
        
             triangle: function (height, x, y, color) {
                var cxt = POP.context,
                    tan = Math.tan(Math.PI / 6),
                    r = tan * height;
                var prev;
                prev = POP.context.fillStyle;
                
                cxt.beginPath();
                cxt.moveTo(x, y);
                cxt.lineTo(x - height, y - r);
                cxt.lineTo(x - height, y + r);
                cxt.lineTo(x,y);
                cxt.fillStyle= color;
                cxt.fill();
                cxt.stroke();
                
                POP.context.fillStyle = prev;
            },

            triangleToo: function (height, x, y, angle, color, width) {
        
                var cxt = POP.context,
                    PI = Math.PI,
                    r = height / Math.cos(PI / 6),
                    a2 = angle + (PI / 6),
                    a1 = angle - (PI / 6),
                    x1 = x + Math.cos(a1)*r,
                    y1 = y + Math.sin(a1)*r,
                    x2 = x + Math.cos(a2)*r,
                    y2 = y + Math.sin(a2)*r,
                    prevColor;
                    
                
                prevColor = cxt.fillStyle;
                cxt.lineWidth = 0;
                cxt.strokeStyle = color;
                cxt.beginPath();
                cxt.moveTo(x, y);
                
                cxt.lineTo(x1, y1);
                cxt.lineTo(x2, y2);
                cxt.lineTo(x,y);
                
                cxt.fillStyle = color;
                cxt.fill();
                cxt.stroke();
                cxt.fillStyle = prevColor;
            },            
           
            scale: 0.5,

            sun: function () {
                var scale = 0.25;
                var circlex = 270,
                     circley = 20,
                     circler = scale*70,
                     
                     tripast = scale*30*scale,
                     triheight = scale*70*scale,
                     outerr = tripast + triheight,
                     color = 'gold';
                
                  // circle
                 this.circle(circlex, circley, circler, color);

                 // t
                 this.triangleToo(triheight, circlex, circley - outerr, Math.PI /2, color);

                 // left
                 this.triangleToo(triheight, circlex - outerr, circley, 0, color);

                 // upper left
                 this.triangleToo(triheight, circlex + outerr* Math.cos(3*Math.PI / 4), circley - outerr * Math.sin(3*Math.PI /4), Math.PI / 4, color);
 
                    // upper right
                 this.triangleToo(triheight, circlex + outerr * Math.cos(Math.PI / 4), circley - outerr*Math.sin(Math.PI /4), 3*Math.PI / 4, color);

                  // right 
                 this.triangleToo(triheight, circlex + outerr, circley, Math.PI, color);
                
                 // lower right
                 this.triangleToo(triheight, circlex + outerr * Math.cos(-Math.PI / 4), circley - outerr * Math.sin(-Math.PI /4), (5)*Math.PI / 4, color);

                 // bottom
                 this.triangleToo(triheight, circlex, circley + outerr, Math.PI *3 / 2, color);

                 // lower left
                 this.triangleToo(triheight, circlex + outerr * Math.cos(5*Math.PI / 4), circley - outerr*Math.sin(5*Math.PI /4), 7*Math.PI / 4, color);
                
              
            },

            curve: function (sx, sy, cx, cy, x, y) {
                var cxt = POP.context;
                var prev = POP.context.fillStyle; 
                cxt.beginPath();
                cxt.moveTo(sx, sy);
                cxt.quadraticCurveTo(cx, cy, x, y);
                cxt.fillStyle = "black";
                cxt.stroke();           
                POP.context.fillStyle = prev;
            },
            
            ellipse: function (sx, sy, cx, cy1, cy2, ex, ey, color) {
                var cxt = POP.context;
                
                var prev = POP.context.fillStyle; 
                cxt.beginPath();
                cxt.moveTo(sx, sy);
               
                cxt.quadraticCurveTo(cx, cy1, ex, ey);// 120,150,170,70, -10);
             
                cxt.moveTo(sx, sy);
                cxt.quadraticCurveTo(cx, cy2, ex, ey);   
              
                
                cxt.fillStyle = color;
                cxt.fill();
                cxt.stroke();            
                POP.context.fillStyle = prev;
            },
            
        };  

        POP.Touch = function (x, y) {
            this.type = "touch";
            this.x = x;
            this.y = y;
            this.r = 5;
            this.opacity = 1;
            this.fade = 0.05;
            this.remove = false;

            this.update = function () {
                this.opacity -= this.fade;
                this.remove = (this.opacity < 0) ? true : false;
            };

            this.draw = function () {
                POP.Draw.circle(this.x, this.y, this.r, 'rgba(255, 0, 0,' + this.opacity + ')');
            };

        };
        
        POP.Bubble = function () {
            //console.log("calling Bubble!");
            this.type = 'bubble';
            this.r = (Math.random() * 20) + 10;
            this.speed = (Math.random() * 3) + 1;

            this.x = 100 + (Math.random() * 30) + 20;
            this.y = POP.HEIGHT + 100;
           
            this.waveSize = 5 + this.r;
            this.xConstant = this.x;

            this.remove = false; 

            this.points = Math.round(1 + (10 + this.r) / this.r, 2);

            this.update = function () {
                var time = new Date().getTime() * 0.002;

                this.y -= this.speed;
                this.x = this.waveSize * Math.sin(time) + this.xConstant;

                if (this.y < -10) {
                    POP.score.bubbles.escaped += 1;
                    this.remove = true;
                }

            };

            this.draw= function () {
                POP.Draw.circle(this.x, this.y, this.r, 'rgba(255, 255, 255, 1)');
            };
        };

        POP.FishBubble = function (x, y) {
            this.type = 'fishbubble';
            this.r = 7;
            this.speed = (Math.random() * 3) + 1;
            
            this.x = x;
            this.y = y;

            this.waveSize = 5 + this.r;
            this.xConstant = this.x;

            this.remove = false;

            this.points = 10 + Math.round(2 + (10 + this.speed)/this.speed, 2);

            this.update = function () {
                 var time = new Date().getTime() * 0.002;

                this.y -= this.speed;
                this.x = this.waveSize * Math.sin(time) + this.xConstant;

                if (this.y < -10) {
                    //POP.score.bubbles.escaped += 1;
                    this.remove = true;
                }
            };

            this.draw = function () {
                POP.Draw.circle(this.x, this.y, this.r, 'gold');
            };
        };

        POP.Fish = function (color, splash) {
            //console.log("calling fish!");
            this.type = 'fish';
            this.r = 20;
            this.speed = (Math.random() * 3) + 1;

            
            this.points = Math.round(this.speed * 2, 2);

            this.x = 0;
            this.y = (Math.random() * 400) + (POP.HEIGHT / 2);

            this.color = color;
            this.yConstant = POP.HEIGHT / 2; 
            this.waveSize = 50 + this.r;
            this.remove = false;
            this.circlex = 0;
            this.flipped = false;

            this.scale = 5; 
            this.loops = 0;

            var time = new Date().getTime() * 0.002;
            var updateSin = function () {
                return this.waveSize * Math.sin(time) + this.yConstant;
            };
        
            var updateCos = function () {
                return this.waveSize * Math.sin(time) + this.yConstant;
            };


            if (Date.now() % 2 === 0) {
                this.updateY = updateSin;
            } else {
                this.updateY = updateCos;
            }
            this.update = function () {
                time = new Date().getTime() * 0.002;


                if (!this.flipped) { 
                    this.y = this.updateY(); //this.waveSize * Math.sin(time) + this.yConstant;
                    this.x += this.speed;
                } else {
                    this.y -= this.speed;
                }

                

                if (this.x > POP.WIDTH) {
                    if (POP.splash) {
                        this.x = 0;
                    } else {
                        this.remove = true;
                        POP.score.fish.escaped += 1;
                   }
                    
                }

                this.loops += 1;

                if (this.loops % 75 === 0) {
                    if (this.circlex === 0) {
                        this.circlex = 1;
                        POP.entities.push(new POP.FishBubble(this.x + this.scale *10, this.y));
                        // POP.score.totalentities += 1;
                    } else {
                        this.circlex = 0;
                    }
                }
            };

            this.draw = function () {
                var draw = POP.Draw;
                var scale = this.scale;

                if (this.flipped) {
                    draw.triangle(scale * 5, this.x + scale * 3, this.y, this.color);
                    draw.ellipse(this.x, this.y, scale * 5 + this.x, scale * 7 + this.y, this.y - scale * 7, scale * 10 + this.x, this.y, this.color);
                    
                    draw.circle(scale * 7 + this.x, this.y + 0.5*scale, 0.5 * scale, 'white');

                    draw.circle(scale * 7 + this.x + this.circlex, this.y + 0.5*scale + this.circlex, scale * 0.2, 'black');
                    draw.curve(scale * 10 + this.x, this.y, 9.5 * scale + this.x, this.y - 0.5 * scale,  8.5 * scale + this.x, this.y + 0.5 * scale);

                    } else {
                    draw.triangle(scale * 5, this.x + scale * 3, this.y, this.color);
                    draw.ellipse(this.x, this.y, scale * 5 + this.x, scale * 7 + this.y, this.y - scale * 7, scale * 10 + this.x, this.y, this.color);
                    draw.circle(scale * 7 + this.x, this.y - 2.5*scale, 0.5 * scale, 'white');
                    draw.circle(scale * 7 + this.x + this.circlex, this.y - 2.5*scale + this.circlex, scale * 0.2, 'black');
                    draw.curve(scale * 10 + this.x, this.y, 9.5 * scale + this.x, this.y + 0.5 * scale,  8.5 * scale + this.x, this.y - 0.5 * scale);
                }

                if (this.y < 0) {
                    this.remove = true;
                }
      
            };
        
        };

        POP.Particle = function (x, y, r, color) {
            this.x = x;
            this.y = y;
            this.r = r;
            this.color = color;

            this.dir = (Math.random() * 2 > 1) ? 1 : -1;

            this.vx = ~~(Math.random() * 4) * this.dir;
            this.vy = ~~(Math.random() * 7);

            this.remove = false;

            this.update = function () {
                this.x += this.vx;
                this.y += this.vy;

                this.vx *= 0.99;
                this.vy *= 0.99;

                this.vy -= 0.25;

                if (this.y < 0) {
                    this.remove = true;
                }
            };

            this.draw = function () {
                POP.Draw.circle(this.x, this.y, this.r, this.col);
            };

        };


        /**
            Collision detection

        @method
        */
        POP.collides = function (a, b) {
            var distance_squared = ( (a.x - b.x) * (a.x - b.x) ) + ( (a.y - b.y) * (a.y - b.y));

            var radii_squared = (a.r + b.r) * (a.r + b.r);

            if (distance_squared < radii_squared) {
                return true;
            } else {
                return false; 
            }

        };

}(this));

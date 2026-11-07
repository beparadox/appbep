/*
 * Restored for appbep.com (2026). Changes from the original:
 *  - Input listens on the canvas only, with pointer events. The original put click AND
 *    touchstart handlers on the whole window, so links on the page couldn't be clicked and
 *    a phone tap counted twice (the touch, then the click the browser synthesizes after it).
 *  - Tap position comes from getBoundingClientRect(), and the canvas is scaled with CSS
 *    (see index.html), replacing resize()'s math, which used a stale scale and broke on
 *    phones in portrait. resize() is left below, unused, for the record.
 * Everything else, including the comments, is as written in 2013-14.
 */
/**
 * Towers of Hanoi
 *
 * Basic HTML5 mobile application
 *
 * @author: Bambridge E. Peterson
 * @date:   May 6th, 2013
 * @desc:   A basic HTML5 mobile application. The default is 3 discs, all starting out on peg 1.
 *          You move the discs to a peg by clicking on the peg. When the discs are on peg 1, you can
 *          change the number of discs by clicking on peg 1.
 *
 *
 */
(function (window) {

    var WIDTH = 900,

    HEIGHT = 600,

    // RATIO > 0 mean portrait orientation
    // RATIO < 0 means landscape
    RATIO = HEIGHT / WIDTH,

    // Namespaced object used to keep some
    // important objects
    TOH = {},
    
    currentWidth = null,

    currentHeight = null,

    canvas = null,

    context = null,

    scale = 1,

    offset = {top: 0, left: 0},

    entities = [],

    movingDiscs = false,

    TOTAL_DISCS = 3,

    srcPeg = null,
    
    dstPeg = null,

    tmpPeg = null,

    pegOne = null,

    pegTwo = null,

    pegThree = null,

    MV = WIDTH *(17/54),

    MAX_DISCS = 6,

    TOHFlag = false,

    TOHLoops = 0;

    // functions
    var init,
    resize,
    update,
    render,
    start,
    stop,
    splashScreen,
    loop;


    TOH.moves = [];

    /**
     * called on window load event
     *
     * @method  init
     *
     *
     */
    init = function () {
        currentWidth = WIDTH;
        currentHeight = HEIGHT;

        canvas = document.getElementsByTagName('canvas')[0];

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        context = canvas.getContext('2d');

        // One pointer event covers mouse, touch and pen, and fires once per tap.
        canvas.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                TOH.input.set(e);
        }, false);

        // the three pegs 
        pegOne = new Peg(1);
        pegTwo = new Peg(2);
        pegThree = new Peg(3);

        // keep track of which one is src, dest and 
        // tmp peg
        srcPeg = pegOne;
        tmpPeg = pegTwo;
        dstPeg = pegThree;

        entities.push(pegOne);
        entities.push(pegTwo);
        entities.push(pegThree);

        var i, disc;
        for (i = TOTAL_DISCS ; i > 0; i -= 1) {
            disc = new Disc(srcPeg.which, i);
            entities.push(disc);
            srcPeg.discs.push(disc);
            srcPeg.numdiscs += 1;
        }

        loop();
    };
    
    /**
     * @method  update
     *
     */
    update = function () {
        var i, l = entities.length,
            checkCollision = false,
            hit, p, q, cp, nd;


        if (TOH.input.tapped) {
            entities.push(new Touch(TOH.input.x, TOH.input.y));
            TOH.input.tapped = false;
            checkCollision = true;
        }
         
        for (i = 0; i < entities.length; i += 1) {
            if (entities[i] === null ) {
            }


            entities[i].update();

            if (entities[i].type === 'peg' && checkCollision) {
                hit = collides(entities[i], {x: TOH.input.x, y: TOH.input.y});

                p = entities[i].which;

                if (hit && !movingDiscs && !TOHFlag) {
                    
                    if (pegOne.discs.length > 0) {
                        srcPeg = pegOne;
                        if (p === 2) {
                            dstPeg = pegTwo;
                            tmpPeg = pegThree;
                        } else if (p === 3) {
                            dstPeg = pegThree;
                            tmpPeg = pegTwo;
                        } else {

                            var L2 = pegOne.discs.length;
                            if (L2 < MAX_DISCS) {
                                for (i2 = 0; i2 < L2; i2 += 1) {
                                    pegOne.discs[i2].y -= Disc.height;
                                }

                                TOTAL_DISCS += 1;
                                var newDisc = new Disc(1, L2 + 1);
                                entities.push(newDisc);
                                pegOne.discs.unshift(newDisc);
                            } else {
                                L2 = pegOne.discs.length;

                                pegOne.discs[L2 - 1].y = HEIGHT - Disc.height; 
                                pegOne.discs = [pegOne.discs[L2 - 1]]; 

                                for (i2 = 0; i2 < entities.length; i2 += 1) {
                                    if (entities[i2].type === 'disc' && entities[i2].disc !== 1) {
                                        entities[i2].active = false;
                                    }

                                }
                                TOTAL_DISCS = 1;
                                pegOne.discs[0].y = HEIGHT - Disc.height;
                            }
                            return false;
                        }
                    } else if (pegTwo.discs.length > 0) {
                        srcPeg = pegTwo;
                        if (p === 1) {
                            dstPeg = pegOne;
                            tmpPeg = pegThree;
                        } else if (p === 2) {
                            return false;
                        } else {
                            dstPeg = pegThree;
                            tmpPeg = pegOne;
                        }
                    } else {
                        srcPeg = pegThree;
                        if (p === 1) {
                            dstPeg = pegOne;
                            tmpPeg = pegTwo;
                        } else if (p === 2) {
                            dstPeg = pegTwo;
                            tmpPeg = pegOne;
                        } else {
                            return false;
                        }
                    }

                    var toh = new TowersOfHanoi(srcPeg.which, tmpPeg.which, dstPeg.which, TOTAL_DISCS);
                    TOH.moves = toh.return_moves();

                    var tmp = srcPeg;
                    srcPeg = dstPeg;
                    dstPeg = tmp;
                    TOHFlag = true;
                    //movingDiscs = true;
                }

            }

           if (!entities[i].active) {
               entities.splice(i, 1);
           }

        }

        if (!movingDiscs && TOH.moves.length > 0) {
            var move = TOH.moves.shift(),
                d;

            if (move[0] === 1) {
                d = pegOne.discs.pop();
            } else if (move[0] === 2) {
                d = pegTwo.discs.pop();
            } else {
                d = pegThree.discs.pop();
            }
            d.destpeg = move[1];
            d.move = true;
            d.moveUp = true;
            movingDiscs = true;
        } else if (TOH.moves.length === 0) {
            // console.log("TOH.moves.length === 0");
            TOHFlag = false;
            movingDiscs = false;
        }
       

  
        checkCollision = false;
    };

    render = function () {
        var i, l = entities.length;

        TOH.draw.clear();

        TOH.draw.text('TOWERS OF HANOI', WIDTH / 2, 40, '40px Monospace', 'black', 'center');

        TOH.draw.text('by Bambridge E. Peterson', WIDTH / 2, 70, '20px Monospace', 'black', 'center');

        TOH.draw.text('Click peg to move discs to it', WIDTH / 2, 100, '15px Monospace', 'black', 'center');

        TOH.draw.text('With discs on peg 1, click it to change number of discs (6 max)', WIDTH / 2, 125, '15px Monospace', 'black', 'center');
        for (i = 0; i < l; i += 1) {
            entities[i].render();
        }
    };

    loop = function () {
        requestAnimationFrame(loop);
        update();
        render();
    };

    resize = function () {
        if (RATIO > 1 ) {
            if (window.innerHeight < HEIGHT) {
                currentHeight = window.innerHeight;
            } else {
                currentHeight = HEIGHT;
            }
            currentWidth = currentHeight * RATIO;
            scale = currentWidth / WIDTH;
        } else {
            if (window.innerWidth < WIDTH) {
                if (window.innerWidth < window.innerHeight) {
                    currentWidth = window.innerWidth ;
                 } else {
                    currentWidth = window.innerWidth *RATIO;
                 }
            } else {
                currentWidth = WIDTH;
            }
            scale = currentHeight / HEIGHT;

            currentHeight =currentWidth * RATIO;
            document.body.style.height= (window.innerHeight - 50) + 'px';
        }

        canvas.style.width = currentWidth + 'px';
        canvas.style.height = currentHeight + 'px';

        // scale = POP.currenHeight / POP.c
       /*  alert(WIDTH + " : " + currentWidth + "\n" + HEIGHT + " : " + currentHeight + "\n" +
                 window.innerWidth + " : " + window.innerHeight);*/
        offset.top = canvas.offsetTop;
        offset.left = canvas.offsetLeft;

        // alert(offset.top + " " + offset.left);
        window.setTimeout(function () {
            window.scrollTo(0, 1);
        }, 1);

    };


    /**
     * For touch events, i.e. when the user touches the screen
     * @class       Touch
     * @constructor
     *
     */
    function Touch(x,y) {
        this.type = "touch";
        this.x = x;
        this.y = y;
        this.r = 5;
        this.opacity = 1;
        this.fade = 0.05;
        this.active = true;
        this.update = function () {
            this.opacity -= this.fade;
            this.active = (this.opacity < 0) ? false : true;
        };

        this.render = function () {
            TOH.draw.circle(this.x, this.y, this.r, 'rgba(255, 0, 0,' + this.opacity + ')');
        };
    }

    /**
     * Cache for input (events, like touch events)
     *
     * @module      TOH
     * @submodule   input {Object}
     *
     */
    TOH.input = {
        x: 0,

        y: 0,

        tapped: false,

        set: function (data) {
            // Map the tap from screen pixels to the 900x600 game coordinates.
            var rect = canvas.getBoundingClientRect();

            this.x = (data.clientX - rect.left) * (WIDTH / rect.width);
            this.y = (data.clientY - rect.top) * (HEIGHT / rect.height);

            this.tapped = true;
        }
    };

   
    /**
     * This represents a wooden peg on display, not the song
     * by Steel Dan
     *
     * @class Peg
     * @constructor
     */
    function Peg(which) {
        this.type = 'peg';
        this.active = true;
        this.which = which;
        this.width = 25;
        this.height = (0.6*HEIGHT); 
        this.y = (0.4*HEIGHT);
        this.discs = [];
        this.numdiscs = 0;

        switch (this.which) {
            case 1:
                this.x = ( (7/54)*WIDTH + (1/18)*WIDTH - 0.5*this.width );
                break;
            case 2:
                this.x = (21/54)*WIDTH + (1/9)*WIDTH - 0.5*this.width;
                break;
            case 3:
                this.x = (35/54)*WIDTH + (1/6)*WIDTH - 0.5*this.width;
                break;
        }

        this.render = function () {
            TOH.draw.rect(this.x, this.y, this.width, this.height, 'brown');
            TOH.draw.text(this.which, this.x + this.width/2, this.y + 20, '15px Monospace', 'white');
        };

        this.update = function () {
            // no update needed.
            // have this here because we call entities.update
            // in main loop
        };
    }

    Peg.height = 0.6*HEIGHT;

    /**
     *
     * @param   size {Number} - there are 5 possible sizes
     * for the disc, each of a different size
     *
     */
    function Disc(peg, disc) {
        this.type = 'disc';
        this.active = true;
        // a unique 'id' number given to the disc
        this.disc = disc;

        this.currentpeg = peg;
        this.destpeg = null;


        // move flag indicates whether we're moving
        // the disc. The rest indicate what direction
        // the disc is being moved
        this.move = false;
        this.moveUp = false;
        this.moveDown = false;
        this.moveLeft = false;
        this.moveRight = false;

        this.speed = 13;

        // disc width varies depending upon the disc.
        // the largest disc possible has width of 7/27 of the WIDTH
        // each space between these discs has width 1/18
        this.discstart = WIDTH * ( (1/18) + (this.currentpeg - 1)*(17/54) );

        this.dww = ((1/5)*(7/54));

        this.moveDistance = ( (17/54) * WIDTH );
        this.width = WIDTH*((7/54) + this.disc*this.dww);
        this.height = (0.096)*HEIGHT;

        this.x = this.discstart + WIDTH*(7/540)*(5 - this.disc);
        this.y = HEIGHT - this.height*(TOTAL_DISCS + 1 - this.disc);

        this.startX = this.x;

        this.render = function () {
            TOH.draw.rect(this.x, this.y, this.width, this.height, 'grey');

            TOH.draw.text(this.disc, this.x + 20, this.y + 20, '20px Monospace', 'white');
        };

        this.update = function () {
            if ( this.move ) {
                if (this.moveUp) {
                    if (this.y > HEIGHT - (Peg.height + Disc.height + 30)) {
                        this.y -= this.speed;
                    } else {
                        this.xdir = this.currentpeg - this.destpeg;
                        this.moveUp = false;
                        if (this.xdir < 0) {
                            this.moveRight = true;
                        } else {
                            this.moveLeft = true;
                        }
                    }
                } 

                if (this.moveLeft) {
                    if (this.x > this.startX - this.xdir*this.moveDistance) {
                        this.x -= this.speed;
                    } else {
                        this.x = this.startX - this.xdir*this.moveDistance;
                        this.moveLeft = false;
                        this.startX = this.x;
                        this.moveDown = true;
                    }
                }
                
                if (this.moveDown) {
                    var L;
                    if (this.destpeg === 1) {
                         L = pegOne.discs.length;
                    } else if (this.destpeg === 2) {
                         L = pegTwo.discs.length;
                    } else {
                         L = pegThree.discs.length;
                    }


                    if (this.y <= HEIGHT - (L + 1)*(Disc.height)) {
                        this.y += this.speed;
                    } else {
                        this.y = HEIGHT - (L + 1)*Disc.height;
                        this.moveDown = false;
                        this.move = false;
                        this.moveUp = false;
                        this.moveRight = false;
                        this.moveLeft = false;
                        movingDiscs = false;
                        this.currentpeg = this.destpeg;

                        if (this.currentpeg === 1) {
                            pegOne.discs.push(this);
                        } else if (this.currentpeg=== 2) {
                            pegTwo.discs.push(this);
                        } else {
                            pegThree.discs.push(this);
                        }

                    } 
                }

                if (this.moveRight) {
                    if (this.x < this.startX - this.xdir*this.moveDistance) {
                        this.x += this.speed;
                    } else {
                        this.x = this.startX - this.xdir*this.moveDistance;
                        this.moveRight = false;
                        this.startX = this.x;
                        this.moveDown = true;
                    }
                }
            }
        };
    }

    Disc.height = (0.096)*HEIGHT;

    /**
     * @class       TowersOfHanoi
     * @constructor
     * @param       speg {Number} - peg discs are currently on
     * @param       tpeg {Number} - temp peg to move discs to
     * @param       dpeg {Number} - peg to move discs to
     * @param       discs {Number} - totalnumber of discs to move
     */
    function TowersOfHanoi(speg, tpeg, dpeg, discs) {
        this.moves = [];
        this.speg = speg;
        this.tpeg = tpeg;
        this.dpeg = dpeg;
        this.discs = discs;
    }

    TowersOfHanoi.prototype.towers_of_hanoi = function (srcpeg, temppeg, destpeg, numdiscs) {
        if (numdiscs > 0) {
            this.towers_of_hanoi(srcpeg, destpeg, temppeg, numdiscs - 1);
            this.moves.push([srcpeg, destpeg]);
            this.towers_of_hanoi(temppeg, srcpeg, destpeg, numdiscs - 1);
        }
    };

    TowersOfHanoi.prototype.return_moves = function () {
        this.towers_of_hanoi(this.speg, this.tpeg, this.dpeg, this.discs);
        return this.moves;
    };

 

    /**
     * Simplified collides function
     *
     * @method      collides
     */
    var collides = function (a, b) {
        var result;
       
        result = a.x <= b.x && 
            b.x <= a.x + a.width &&
            a.y <= b.y &&
            b.y <= a.y + a.height;

        return result;
    };

    /**
     * @module      TOH
     * @submodule   draw {Object} - basic collection of useful drawing functions
     *
     */
    TOH.draw = {
            clear:  function () {
                context.clearRect(0, 0, WIDTH, HEIGHT);
            },

            rect:   function (x, y, w, h, col) {

                var prev = context.fillStyle;
                context.fillStyle = col;
                context.fillRect(x, y, w, h);
                context.fillStyle = prev;
            },

            circle: function (x, y, r, col) {
                var prev;
                prev = context.fillStyle;
                context.fillStyle = col;
                context.beginPath();
                context.arc(x + 5, y + 5, r, 0, Math.PI * 2, true);
                context.closePath();
                context.fill();
                context.fillStyle = prev;
            },

            text: function (string, x, y, font, col, align) {
                var prev;
                prev = context.fillStyle;

                context.font = font;
                context.textAlign = align;
                context.fillStyle = col;
                context.fillText(string, x, y);
                context.fillStyle = prev;
            },
        
             triangle: function (height, x, y, color) {
                var cxt = context,
                    tan = Math.tan(Math.PI / 6),
                    r = tan * height;
                var prev;
                prev = context.fillStyle;
                
                cxt.beginPath();
                cxt.moveTo(x, y);
                cxt.lineTo(x - height, y - r);
                cxt.lineTo(x - height, y + r);
                cxt.lineTo(x,y);
                cxt.fillStyle= color;
                cxt.fill();
                cxt.stroke();
                
                context.fillStyle = prev;
            },

            triangleToo: function (height, x, y, angle, color, width) {
        
                var cxt = context,
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
                var cxt = context;
                var prev = context.fillStyle; 
                cxt.beginPath();
                cxt.moveTo(sx, sy);
                cxt.quadraticCurveTo(cx, cy, x, y);
                cxt.fillStyle = "black";
                cxt.stroke();           
                context.fillStyle = prev;
            },
            
            ellipse: function (sx, sy, cx, cy1, cy2, ex, ey, color) {
                var cxt = context;
                
                var prev = context.fillStyle; 
                cxt.beginPath();
                cxt.moveTo(sx, sy);
               
                cxt.quadraticCurveTo(cx, cy1, ex, ey);// 120,150,170,70, -10);
             
                cxt.moveTo(sx, sy);
                cxt.quadraticCurveTo(cx, cy2, ex, ey);   
              
                
                cxt.fillStyle = color;
                cxt.fill();
                cxt.stroke();            
                context.fillStyle = prev;
            },
            
        };  

    /**
     * call the load method when the window has loaded
     * @event       load
     */
    window.addEventListener('load', init, false);


}(window));


/**
 *  
 requestAnimationFrame code

 http://paulirish.com/2011/requestanimationframe-for-smart-animating/

 http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

 requestAnimationFrame polyfill by Erik Möller

 fixes from Paul Irish and Tino Zijdel

 *
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

}(window));

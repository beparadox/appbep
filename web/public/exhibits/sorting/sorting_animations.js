/*
 * Sorting animations (c. 2016), restored for appbep.com (2026). Changes from the original:
 *  - The controls are disabled while a sort is running. Before, clicking Sort twice ran two
 *    sorts on the same bars at once, so each sort now calls done() when it finishes.
 *  - Sorting an already-sorted list with quick or merge sort no longer crashes (no frames).
 *  - Removed the console.log calls from the running code (one ran on every frame) and stopped
 *    running the self-test on startup. The test functions are still below, unused.
 *  - No more Bootstrap or utils.js (nothing here used them).
 *  - The canvas is always wider than it is tall (it used to be 75% of the window in each
 *    direction, which made a tall, narrow strip on a phone held upright), and it is redrawn
 *    when the phone rotates.
 *  - A speed picker stretches the pauses between frames. "Original" uses the 2016 timings
 *    (20-100 ms per frame); the default is twice as slow so you can follow along.
 * The algorithms themselves are untouched.
 */
(function () {
    // primary aspects of our model
    var model,
        view,
        controller;

    /**
     * @method isSorted
     */
    function isSorted(array) {
        var i, l = array.length;
        if (l === 1) return true;

        for (i = 0; i < l - 1; i += 1) {
            if (array[i] > array[i + 1]) return false;
        }
        return true;
    } 

    function mergeSorted(array, aux, low, mid, high, copyarr) {
        if (!isSorted(array.slice(low, mid + 1)) || !isSorted(array.slice(mid + 1))) {
            //alert("array halves not sorted");
            // console.log("array halves not sorted");
            //console.dir(array.slice(low, mid + 1));
            // throw TypeError();
        }
        var p1 = low,
            p2 = mid + 1,
            k = low;

        for (var i = low; i <= high; i += 1) { 
            aux[i] = array[i];
        }

        while (k <= high) {
            if (p1 > mid)               array[k] = aux[p2++];
            else if (p2 > high)         array[k] = aux[p1++];
            else if (aux[p1] < aux[p2]) 
                                        array[k] = aux[p1++];
            else                        array[k] = aux[p2++];
            copyarr.push(array.slice());
            k++;
        }
    }

    function mergeSort(array, aux, low, high, copyarr) {
        if (high <= low) return;

        var half = low + ~~( (high - low) / 2);

         // setTimeout(function() {
            mergeSort(array, aux, low, half, copyarr);
            mergeSort(array, aux, half + 1, high, copyarr);
            mergeSorted(array, aux, low, half, high, copyarr);
         // }, 200);

    } 

    function quickSortPartition(array, low, high, copyarr) {
        var i = low,
            j = high,
            pivot = array[low + ~~((high - low) / 2)],
            tmp;

            while (i <= j) {
                while (array[i] < pivot) {
                    i++;
                }

                while (array[j] > pivot) {
                    j--;
                }

                if (i <= j) {
                    tmp = array[i];
                    array[i] = array[j];
                    array[j] = tmp;
                    copyarr.push(array.slice());
                    i++;
                    j--;
                }
            }

            return i;
    }

    function quickSort(array, low, high, copyarr) {
        var index = quickSortPartition(array, low, high, copyarr);
      
        //setTimeout(function () { 
            if (low < index - 1)
                quickSort(array, low, index - 1, copyarr);
        //}, 500);
        //setTimeout(function () { 
            if (index < high)
                quickSort(array, index, high, copyarr);
        //}, 500);
    }

    function insertionSort(array) {
        var i,
            j,
            l = array.length,
            tmp;

        for (i = 0; i < l - 1; i += 1) {
            // j represents the unsorted portion of the array;
            // up to index i is the sorted portion
            j = i + 1;
            while (j > 0 && array[j] < array[j - 1]) {
                tmp = array[j];
                array[j] = array[j - 1];
                array[j - 1] = tmp;
                j--;
            }
        }
    }

    function insertionSortRecursive(array, i, func) {
        var j,
            l = array.length,
            tmp;

            j = i + 1;
            while (j > 0 && array[j] < array[j - 1]) {
                tmp = array[j];
                array[j] = array[j - 1];
                array[j - 1] = tmp;
                view.draw();
                j--;
            }
            setTimeout(function () {
                if (i < array.length - 1) {
                    insertionSortRecursive(array, i + 1, func);
                } else if (func) {
                    func();
                }
            }, view.delay(100));
    }

    function selectionSort(array) {
        var i, j,
            l = array.length,
            tmp;

        for (i = 0; i < l - 1; i += 1) {
            for (j = i + 1; j < l; j += 1) {
                if (array[j] < array[i]) {
                    tmp = array[i];
                    array[i] = array[j];
                    array[j] = tmp;
                }
            }
        }
    }

    function selectionSortRecursive(array, i, func) {
        var j,
            l = array.length,
            tmp,
            min = i;

            for (j = i + 1; j < l; j += 1) {
                if (array[j] < array[min]) {
                    min = j;
                    //tmp = array[i];
                    //array[i] = array[j];
                    //array[j] = tmp;
                    //view.draw();
                }
            }
            tmp = array[i];
            array[i] = array[min];
            array[min] = tmp;
            view.draw();



            setTimeout(function() {
                if (i < array.length - 1) {
                    selectionSortRecursive(array, i + 1, func);
                } else if (func) {
                    func();
                }
            }, view.delay(100));
    }

    function bubbleSort(array) {
        var i, j,
            l = array.length,
            tmp;

        for (i = 0; i < l - 1; i += 1) {
           for (j = 1; j < l; j += 1) {
              if (array[j - 1] > array[j]) {
                  tmp = array[j - 1];
                  array[j - 1] = array[j];
                  array[j] = tmp;
              }
           }
        }
    }

    function bubbleSortRecursive(array, i, func) {
        var j,
            l = array.length,
            tmp;

        for (j = 1; j < l; j += 1) {
            if (array[j - 1] > array[j]) {
                tmp = array[j - 1];
                array[j - 1] = array[j];
                array[j] = tmp;
            }
        }

        setTimeout(function () {
            if (i < l - 1) {
                view.draw();
                bubbleSortRecursive(array, i + 1, func);
            } else {
                view.draw();
                if (func) func();
            }
        }, view.delay(50));
    }

    model = {
        init: function() {
            this.generateRandomPoints();
        },

        points: [],

        getNumberPoints: function() {
            return this.points.length;
        },

        generateRandomPoints: function() {
            var i,
            w = controller.getCanvasWidth(),
            h = controller.getCanvasHeight(),
            dist = controller.getPointDist();

            if (this.points.length > 0) {
                this.points = [];
            }

            for (i = 0; i < w; i += dist) {
               this.points.push(~~(Math.random() * h));
            }  

        }
    };

    view = {

        animationFrameId: null,

        canvas_width: null, 

        canvas_height: null,

        ctx: null,

        point_dist: 10,

        init: function() {
            // get a reference to this
            var that = this;
            // the canvas which we'll be drawing the animations on
            this.canvas = document.getElementById('animations_canvas');
            this.canvas.style.border = "1px solid black";
            this.sizeCanvas();
            this.ctx = this.canvas.getContext('2d');

            this.sort_button = document.getElementById('sort_button');
            this.select = document.getElementById('algo');
            this.speed = document.getElementById('speed');
            this.new_points_button = document.getElementById('new_points_button');

            var setAlgo = function (el) {
                controller.algo = this.value;
                controller.getNewPoints();
                view.draw();

            };
            this.select.addEventListener('change', setAlgo);
            controller.algo = "quick";
                
            this.sort_button.addEventListener('click', function() {
                controller.sort();
            });

            this.new_points_button.addEventListener('click', function() {
                controller.getNewPoints();
                view.draw();
            }); 

            // Rotating a phone changes the width: resize, then draw fresh bars. (Height-only
            // changes are ignored; mobile browsers fire resize when the address bar hides.)
            var lastWidth = window.innerWidth;
            window.addEventListener('resize', function() {
                if (window.innerWidth === lastWidth) return;
                lastWidth = window.innerWidth;
                if (view.busy) {
                    view.resizePending = true;
                } else {
                    view.resizeAndRedraw();
                }
            });
        },

        // Wide, never tall: full width on a phone, 75% of the window on bigger screens
        // (as before). The height is at most 3/4 of the width, and leaves room for the
        // title and buttons so they stay on screen when a phone is turned sideways.
        sizeCanvas: function() {
            var w = window.innerWidth < 640 ? window.innerWidth - 32 : 0.75 * window.innerWidth;
            this.canvas_width = Math.floor(w);
            this.canvas_height = Math.floor(Math.max(150,
                Math.min(0.75 * window.innerHeight, window.innerHeight - 140, 0.75 * w)));
            this.canvas.width = this.canvas_width;
            this.canvas.height = this.canvas_height;
        },

        resizeAndRedraw: function() {
            this.resizePending = false;
            this.sizeCanvas();
            controller.getNewPoints();
            this.draw();
        },

        // Pause between animation frames, scaled by the speed picker (1 = the 2016 timing).
        delay: function(ms) {
            return ms * Number(this.speed.value || 1);
        },

        draw: function() {
            var args = Array.prototype.slice.call(arguments),
            points = (args.length > 0) ? args.pop() : controller.getPoints(),
            ctx = this.ctx,
            cw = this.canvas_width,
            ch = this.canvas_height;

            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, cw, ch);
            ctx.fillStyle = "#000000";
            for (var i = 0; i < cw; i += this.point_dist) {
                var h = i / this.point_dist;
                ctx.fillRect(i, ch - points[h], 6, points[h]);
            }
        },

        setBusy: function(busy) {
            this.busy = busy;
            if (!busy && this.resizePending) this.resizeAndRedraw();
            this.sort_button.disabled = busy;
            this.new_points_button.disabled = busy;
            this.select.disabled = busy;
            this.sort_button.textContent = busy ? 'Sorting...' : 'Sort';
        },

        update: function() {

        },

        animate: function() {

        }

    };

    controller = {
        init: function() {
            view.init();
            model.init();
            this.animFrame();
            view.draw();
        },

        sort: function() {
            var points = this.getPoints();
            // Lock the controls until this sort's animation finishes.
            view.setBusy(true);
            function done() {
                view.draw();
                view.setBusy(false);
            }
            function drawQuickPoints(copyarr, i) {
                if (l === 0) return done(); // already sorted: nothing to animate
                view.draw(copyarr[i]);
                setTimeout(function () {
                    if (i < l - 1) {
                        drawQuickPoints(copyarr, i + 1);
                    } else {
                        done();
                    }
                }, view.delay(40));
            }

            function drawMergePoints(sorted, i) {
                    if (l === 0) return done();
                    view.draw(sorted[i]);
                    setTimeout(function () {
                        if (i < l - 1) {
                            drawMergePoints(sorted, i + 1);
                        } else {
                            done();
                        }
                    }, view.delay(20));
                }
            var l;

            if (this.algo === "quick") {
                var copyarr = [];
                quickSort(points, 0, points.length - 1, copyarr);
                l = copyarr.length;
                drawQuickPoints(copyarr, 0);
            } else if (this.algo === "bubble") {
                bubbleSortRecursive(points, 0, done);
            } else if (this.algo === "merge") {
                var aux = [],
                    sorted = [];
                mergeSort(points, aux , 0, points.length - 1, sorted);
                var i = 0; 
                l = sorted.length;

                drawMergePoints(sorted, i);
            } else if (this.algo === "insertion") {
                insertionSortRecursive(points, 0, done);
            } else if (this.algo === "selection") {
                selectionSortRecursive(points, 0, done);
            } else {
                alert("Illegal algorithm");
                done();
            }
        },

        getNewPoints: function() {
            model.generateRandomPoints();
        },

        getCanvasHeight: function() {
            return view.canvas_height;
        },

        getCanvasWidth: function() {
            return view.canvas_width;
        },

        getPoints: function() {
            return model.points;
        },

        getPointDist: function() {
            return view.point_dist;
        },

        animFrame: function() {
            if (!requestAnimationFrame) 
                window.requestAnimationFrame = function (callback, element) {
                    var current = Date.now();
                    var callTime = Math.max(0, 16 - (current - lastTime));
                    var id = window.setTimeout(function () {
                        callback(current + callTime);
                    }, callTime);
                    lastTime = current + callTime;
                    return id;
                    
                };

            if (!window.cancelAnimationFrame)
                window.cancelAnimationFrame = function (id) {
                    clearTimeout(id);
                };

            window.requestAnimationFrame = window.requestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.msRequestAnimationFrame;
        }
    };

    function getRandomNums(size) {
        var nums = [];

        for (var i = 0; i < size; i += 1) {
            nums.push(~~(Math.random()*1000));
        }

        return nums;
    }

    function testMergeSort(numtests) {
        var aux, nums, size = 20;

        for (var i = 0; i < numtests; i += 1) {
            nums = getRandomNums(size);
            aux = [];
            mergeSort(nums, aux, 0, size - 1); 
            if (!isSorted(nums)) {
                console.log('merge sort failed!');
                return false;
            }
        }
        console.log('merge sort succeeded!');
        return true;
    }

    function testInsertionSort(numtests) {
        var nums, size = 20;

        for (var i = 0; i < numtests; i += 1) {
            nums = getRandomNums(size);
            insertionSortRecursive(nums, 0); 
            if (!isSorted(nums)) {
                console.log('insertion sort failed!');
                console.log(nums);
                return false;
            }
        }
        console.log('insertion sort succeeded!');
        return true;
    }

   function testSelectionSort(numtests) {
        var nums, size = 20;

        for (var i = 0; i < numtests; i += 1) {
            nums = getRandomNums(size);
            selectionSort(nums); 
            if (!isSorted(nums)) {
                console.log('selection sort failed!');
                console.log(nums);
                return false;
            }
        }
        console.log('selection sort succeeded!');
        return true;
    }

    if (!Array.prototype.copy) {
        Array.prototype.copy = function() {
            if (this === null) {
                throw new TypeError('Array.prototype.copy being called on null or undefined object');
            }

            var copy = [],
                l = this.length;

            for (var i = 0; i < l; i += 1) {
                copy[i] = this[i];
            }

            return copy;

        };
    }

    document.addEventListener('DOMContentLoaded', function() {
        controller.init();
    });
}());

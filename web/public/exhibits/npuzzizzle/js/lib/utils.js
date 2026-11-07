define(

[],

function () {

    /**
    * The Object.create method allows one to create
    * new objects for given prototype. 
    * Same method
    * used as in David Flanigan's JavaScript: The
    * Definitive Guide
    * @method create 
    * @param {Object} o object used as prototype 
    * for the new object
    * @return {Object} new object
    */
    Object.inherit = function (o) {
        // console.log("in Object.create");
        'use strict';
        if (o === null) throw TypeError();
        if (Object.create) {
            return Object.create(o);
        }

        console.log("no Object.create available");
        var t = typeof o;
        if (t !== "object" && t !== "function") throw TypeError();
        var F = function () {};
        F.prototype = o;
        return new F();
    };

    /**
     * The method 'method' allows us to add new methods
     * to an object's prototype without having to type
     * the 'prototype' property name. 
     * @method method 
     * @param {String} name name of new method
     * @param {Object} func the corresponding function 
     */
    if (Function.prototype.method === undefined) {
        Function.prototype.method = function (name, func) {
            'use strict';
            this.prototype[name] = func;
            return this;
        };
    }
    /**
     * The 'equals' method add to the Array prototype
     * and takes an array as input and
     * determines if equals the given array 
     * @method equals
     * @param {Array} array input array

     * @return {Boolean} true if the two are equal, false
     * otherwise
     */
    Array.method('equals', function (array) {
        'use strict';
        var l = this.length, i;
        if (array.constructor.name !== "Array") {
            return false;
        }
        for (i = 0; i < l; i += 1) {
            if (this[i] !== array[i]) {
                return false;
            }
        }
        return true;
    });
    /**
     * The range method is used to initiate a newly 
     * created array literal with a given size and
     * value
     * @method init
     * @param {Object} init_value an object to initalize the
     * array values to
     * @param {Number} size the size of the newly created array 
     * @return {Object} undefined
     */
    Array.method('init', function (size, value) {
        'use strict';
        var i;

        for (i = 0; i < size; i += 1) {
            this[i] = value;
        }

        return this;
    });
 
    /**
     * The range method is used to initiate a newly 
     * created array literal with a given size and
     * range of integers
     * @method init
     * @param {Object} init_value an object to initalize the
     * array values to
     * @param {Number} size the size of the newly created array 
     * @return {Object} undefined
     */
    Array.method('range', function (beg, end) {
        'use strict';
        var i, j = end - beg;

        for (i = 0; i < j; i += 1) {
            this[i] = beg;
            beg += 1;
        }

        return this;
    });

    /**
     * The in_array method determines if a given element
     * is in the calling array
     * @method in_array
     * @param {Object} obj the object whose membership relation
     * to the given array is in question
     * @return {Boolean} true if the objects in the array and false
     * otherwise 
     */
    Array.method('in_array', function (obj) {
        'use strict';
        var l = this.length,
            i;
        for (i = 0; i < l; i += 1) {
            if (this[i] === obj) {
                return true;
            }
        }
        return false;
    });

    /**
     * The copy method returns a copy method
     * of a given array
     * @method copy
     * @return {Array} returns a copy of the array 
     */
    Array.method('copy', function () {
        'use strict';
        var l = this.length,
            copy = [],
            i;
        for (i = 0; i < l; i += 1) {
            copy[i] = this[i];
        }
        return copy;
    });

    /**
     * The swap method simply swaps two elements
     * of an array
     * @method swap
     * 
     */
    Array.method('swap', function (index1, index2) {
        'use strict'
        var tmp;
        tmp = this[index1];
        this[index1] = this[index2];
        this[index2] = tmp;	
        return this;
    });

    /**
     * The shuffle method will shuffle an array
     * of elements
     *
     * Based on the 
     * @method shuffle
     */
    Array.method('shuffle', function () {
        'use strict';
        /* Get the length of the array,
         * half this amount, and define
         * and explored dictionary.
         */
         var currentIndex = this.length,
         tempValue,
         randomIndex;

         while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            tempValue = this[currentIndex];
            this[currentIndex] = this[randomIndex];
            this[randomIndex] = tempValue;

        }
        return this;
    });

    Array.method('sum', function () {
        'use strict';

        var l = this.length,
        i,
        sum = 0;

        for (i = 0; i < l; i += 1) {
            sum += this[i];
        }

        return sum;
    });

    /**
    @module      Utils
    **/
    function Utils() {}

    return new Utils();
});

//var requirejs = require('requirejs');

define (
    // no dependencies
    [],

    function () {
        /**
        * Given an array thelist that is order by a specific
        * value in a, inset the node
        * at the
        * @function bsearchInsert
        * @param    Array thelist
        * @param    node - the node to be inserted
        * @param    name name of property value to in
        * @param    order - ascending or descending
        */
        return function binarySearchInsert(thelist, node, name, order) {
            //console.log("in binarySearchInsert ");
            //console.log(thelist);
            if (node === undefined || name === undefined ||
                thelist === undefined) {
                throw {
                    name: 'MissingParameter',
                    msg: 'Missing either node, name or thelist'
                }
            }

            var val = node[name],
            error_str = '',
            min = 0,
            half,
            max = thelist.length, 
            err_obj,
            floor = Math.floor;

            if (max === 0) {
                thelist.push(node);
                return thelist;
            }

            error_str += "From bSearchInsert\n";
            error_str += val + " is not a number.\n";
            error_str += name + " is the property value";
            err_obj = {
                name: "ValueError",
                msg: error_str
            };

            if( val  === undefined ) {
                throw error_obj;
            }
           
            function bsi(thelist, min, max) {
                if ( max === min || (max - min === 1) ) {
                    if ( val <= thelist[min][name] ) {
                        thelist.splice(min + 1, 0, node);
                    } else {
                        thelist.splice(min, 0, node);
                    }
                    return thelist;
                }
                //console.log("max = " + max + " min = " + min);
                half = min + floor((max - min)/2);
               // for now, just descending order
                if (thelist[half][name] >= val) {
                    // as the given value is smaller than or equal
                    // to the list element, we want the 'upper' half
                    // of the list (in terms of index). So min needs
                    // to change
                    bsi(thelist, half, max);
                } else {
                    // otherwise, max needs to be changed
                    bsi(thelist, min, half);
                }
            } // end of bsi

            bsi(thelist, min, max);
       } // end of returned function
    } // end of anonymous wrapper function
);

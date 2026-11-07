define(

    ['lib/utils'], 

    function (utils) {
        /**
        *   The N-Puzzle is a square sliding block puzzle, with a total of N + 1
            elements, N being blocks numbered 1 through N, and the last element 
            actually being a 'blank' spot. The objective is to arrange the blocks
            numbered 1 through N in numeric order left-to-right, top-to-bottom. So
            the 8-Puzzle solution would look like:

                1   2   3
                4   5   6   
                7   8   
        *
        * The problem module is based upon the definition of a problem
        * found in the textbook Artificial Intelligence: A Modern Approach
        */

        /**
        * @class        NPuzzleProblem
        * @constructor
        * @param        {Number} dimension - dimension of the puzzle
        *               Can be 3, 4 for now
        * @param        {String} hfun - heuristic function to use for the
        *               graph search
        */
        function NPuzzleProblem( dimension, hfun, i_state) {
            /**
            * @property     {Number} size
            * @private
            *               equal to the square of the dimension,
            *               or the number of squares in the puzzle
            *               grid. Usually 9, 16, or 25
            */
            var size = dimension * dimension,

            /**
            * @property     hfun
            * @type         {String}
            * @private
            */
            hfun = hfun || 'md',

            /**
            * @property     goal_state
            * @type         {Array}
            * @private
            */
            goal_state = [].range(1, size + 1),

            /**
            * @property     init_state
            * @type         {Array}
            * @private
            */
            init_state = [] || init_state,
 
            /**
            * @property      md_table
            * @type         {Array}
            * @private
            */
            md_table,

            heuristic;

            md_table = (function () {
                var i,
                dim = dimension,
                l = size,
                md_table = [], 
                newtable,
                j,
                x,
                y,
                floor = Math.floor,
                abs = Math.abs;

                for (i = 0; i < l; i += 1) {
                    newtable = [];
                    for (j = 0; j < l; j += 1) {
                        if (i === j) {
                            newtable[i] = 0;
                        }
                        else {
                           x = abs((i % dim) - (j % dim));
                           y = abs(floor(i / dim) - floor(j / dim));
                           newtable.push(x + y);
                        }
                    }
                    md_table.push(newtable);
                }

                return md_table;
            }());

           /**
            * Get the heuristic used in the search function. 
            *
            * @method      heuristic
            * @private
            *
            */
            heuristic = (function () {
                // manhattan distance
                if (hfun === 'md') { 
                    return function (state) {
                        return state.reduce(function(pVal, cVal, index, array) {
                            if (array[index] === size) return 0;

                            return md_table[index][cVal - 1] + pVal;
                        }, md_table[0][state[0] - 1]);
                    }
                } else if (hfun === 'mt') {
                // misplaced tiles
                    return function (state) {

                    }
                } else if (hfun === 'ann') {
                // weights developed by an Artificial Neural Network
                    return function (state) {

                    }
                }
            }());


            /**
            * @method       setInitState
            * @param        {Array}     state
            * @return       {Object}    this
            *
            */
            this.setInitState = function (state) {
                if ( !state ) {
                     init_state = this.generateInitState();
                } else {
                    if (this.validState(state) ) {
                        init_state = state;
                    } else {
                        throw {
                            name: "InvalidState",
                            msg:  "You provided an invalid state"
                        }
                    }
                }

                return this;
            };

            /**
            * @method   generateInitState
            * @return   {Array} acceptable initial state for the npuzzle
            */
            this.generateInitState = function () {
                var index,
                mdsize,
                num_inversions;

                var init_s = [].range(1, size + 1);
            
                init_s.shuffle();
                index = init_s.indexOf(size);
                if (index > -1) {
                    mdsize = this.md(index, size);
                }
                num_inversions = this.numInversions(init_s);

                while ( (mdsize + num_inversions) % 2 !== 0 ) {
                    init_s.shuffle();
                    index = init_s.indexOf(size);
                    mdsize = this.md(index, size);
                    num_inversions = this.numInversions(init_s);
                }
                
                return init_s;
            };


            /**
            * @method       validState
            * @param        {Array}     state
            * @return       {Boolean} 
            */
            this.validState = function (state) {
                var index = state.indexOf(size);

                if (index === -1) {
                    throw {
                        name: "IndexError",
                        msg: "Missing size in state given"
                    }
                }

                if ( (this.numInversions(state) + this.md(index, size)) % 2 === 0) {
                    return true;
                } else {
                    var err_obj = {
                        "index": index,
                        "size": size,
                        "md": this.md(index, size),
                        "inversions": this.numInversions(state),
                        "state": state
                    };
                    return false;
                }
            };

            /**
            * @method       numInversions
            * @param        {Array} state
            * @return       {Number} number of inversions in array 
            */
            this.numInversions = function (array) {
                var l = array.length,
                i,
                num_inversions = 0,
                j;
                
                for (i = 0; i < l - 1; i += 1) {

                    for (j = i + 1; j < l; j += 1) {
                        if ( array[i] > array[j] ) {
                            num_inversions += 1;
                        }
                    }
                }

                return num_inversions; 
            };

           /**
            * @method       md
            * @param        {Number}    index   index of the given value 
            * @param        {Number}    value  
            * @return       {Number}    Manhattan (city-block) distance of value from it's
            *                position in the solution state
            */
            this.md = function (index, value) {
                return md_table[index][value - 1];
            };

           /**
            * @method       getInitState
            * @return       {Array} initial state of the problem
            */
            this.getInitState = function () {
                return init_state;
            };

            /**
            @method     getSize
            @return     {Number}
            **/
            this.getSize = function () {
                return size;
            };

            /**
            * @method       getDimension
            * @return       {Number} dimension 
            */
            this.getDimension = function () {
                return dimension;
            };

            /**
            * @method       getGoalState
            * @return       {Array} goal_state
            */
            this.getGoalState = function () {
                return goal_state;
            };

            /**
            * checks if the goal state is correct
            * @method:      goal_test
            * @param:       {Array} state
            * @return:      {Boolean} 
            *
            */
            this.goalTest = function (state) {
                return goal_state.toString() === state.toString();
            };

            /**
            * @method:      actions
            * @param:       {Array}  state
            */
            this.actions = function (state) {
                var actions = [],
                s = size,
                blank_index = state.indexOf(s),
                d = dimension;
               
                //  2 move blank_spot up
                // -2 move blank_spot down
                //  1 move blank_spot right
                // -1 move blank_spot left

                // if the blank_index minus the dimension
                // is greater than 0, than we can move the
                // blank_spot 'up' one spot
                // so add the action 2
                if ( blank_index - d >= 0) {
                    actions.push(2);
                } 
                
                if ( blank_index + d < s ) {
                    actions.push(-2);
                } 
                
                if ( blank_index % d !== 0 ) {
                    actions.push(-1);
                } 
                
                if ( (blank_index + 1) % d !== 0) {
                    actions.push(1);
                } 
                 
                return actions;
            };

            /**
            * @method       result
            * @param        {Array}     state
            * @param        {Number}    action - can be 1, -1, -2 or 2
            * @return       {Array}     newstate - the newstate generated by applying action
            *           to the state
            */
            this.result = function (state, action) {
                var newstate = state.copy(),
                dim = dimension,
                blank_index = newstate.indexOf(size),
                index,
                tmp;

                if ((index = state.indexOf(size)) === -1) {
                    throw {
                        name: 'InvalidState',
                        msg: size + ' not found in state'
                    }
                }

                if (action === -1) {
                   // move left 
                   if (blank_index % dim !== 0) {
                        newstate = newstate.swap(blank_index, blank_index - 1);
                   }
                } else if (action === 1) {
                    // move right
                   if ((blank_index + 1) % dim !== 0) {
                        newstate = newstate.swap(blank_index, blank_index + 1);
                   }

                } else if (action === 2) {
                    // move up
                   if (blank_index - dim > -1) {
                        newstate = newstate.swap(blank_index, blank_index - dim);
                   }
                } else if (action === -2) {
                    // move down
                   if (blank_index + dim < size) {
                        newstate = newstate.swap(blank_index, blank_index + dim);
                   }
                
                } else {
                    throw {
                        name: 'InvalidAction',
                        msg: 'Action ' + action + ' is invalid'
                    }
                }

                return newstate
            };

            /**
            * @method   stepCost
            * @return   {Number} 1
            */
            this.stepCost = function () {
                return 1; 
            };

            /**
            * @method   pathCost        return path cost of the given node
            * @param    {ChildNode}     node
            * @return   {Number}        path-cost of the node
            */
            this.pathCost = function (node) {
                return this.stepCost() + node['path-cost'];
            };

            /**
            * @method   childNode
            * @param    {Object} par
            * @param    {Number} action
            * @return   {Object} node
            */
            this.childNode = function (par, action) {
                var node = {};
                node['parent'] = par;
                node['action'] = action || null;

                if (par === undefined) {
                    node['state'] = init_state;
                    node['path-cost'] = 0;
                } else {
                    node['state'] = this.result(par['state'], action);
                    node['path-cost'] = par['path-cost'] + this.stepCost();
                }

                node['hn'] = heuristic(node['state']);
                node['fn'] = node['hn'] + node['path-cost'];

                return node;
            };

          this.setInitState(i_state);
        } // end of function NPuzzleProblem 

        var problem = {};

        problem.npuzzle = function (dim, hfun) {
            return new NPuzzleProblem(dim, hfun);
        }

        return problem;
    } // end of anonymous wrapper function

);

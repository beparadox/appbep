define(
    [
        'lib/binarySearchInsert'
    ], 
   
    function (binarySearchInsert) {
        /**
        The search module 

        @module     search

        **/
        var search = {};
    
        /**
        * @class        GraphSearch
        * @constructor
        * @param        {Problem}    problem
        *
        */
        function GraphSearch( problem ) {
            if (problem === undefined) {
                throw {
                    name: "UndefinedProblem",
                    msg: "The problem sent to GraphSearch is undefined"
                };
            }

            var frontier = [],
            explored = {},
            num_explored = 0,
            num_frontier = 0;

            // push the first node onto the frontier
            frontier.push(problem.childNode());

            /**
            * @method   getSucessors
            * @param    {Object} node node whose successors we want
            * @return   {Array} successors
            *
            */
            this.getSuccessors = function ( node ) {
                var successors = [],
                actions = problem.actions(node.state),
                i, l = actions.length;

                for (i = 0; i < l; i += 1) {
                    successors.push(problem.childNode(node, actions[i]));    
                }

                return successors;
            };

            /**
            * @method   frontierEmpty
            * @return   Boolean true if frontier is nonempty, false otherwise
            */
            this.frontierEmpty = function () {
                return frontier.length === 0;
            };

         
            /**
            * @method       getFrontier
            * @return       {Array} frontier
            */
            this.getFrontier = function () {
                return frontier;
            };

            /**
            * @method   getExplored
            * @return   {Object} explored
            */
            this.getExplored = function () {
                return explored;
            };

            /**
            * @method   incNumExplored
            */
            this.incNumExplored = function () {
                num_explored += 1;
            };

            /**
            * @method   incNumFrontier
            */
            this.incNumFrontier = function () {
                num_frontier += 1;
            };

        } // end of GraphSearch


        /**
        * @class        AStarGraphSearch
        * @constructor  
        * @param        {Problem} problem the problem associated with the search
        */
        function AStarGraphSearch( problem ) {
            var frontier = [],
            explored = {},
            num_explored = 0,
            num_frontier = 0;

            frontier.push(problem.childNode());

            GraphSearch.apply(this, arguments);
          
            /**
            * @method       frontierInsert
            * @param        {Array} frontier
            * @param        {Object} node
            */
            this.frontierInsert = function ( frontier, node ) {
                binarySearchInsert( frontier, node, 'fn' );
                // this.incNumFrontier();
                num_frontier += 1;
            };

            /**
            * @method       frontierReplace
            * @param        {Array} frontier
            * @param        {Number} index
            * @param        {ChildNode} node
            */
            this.frontierReplace = function ( frontier, index, node ) {
                frontier[index] = node;
            };

            /**
            * @method       getProblem 
            * @return       {Problem}   problem
            */
            this.getProblem = function () {
                return problem;
            };
            
            /**
            * @method       searchLoop
            * @return       {Object}    goal node if found, otherwise false    
            */
            this.searchLoop =  function () {
                var node,
                successors,
                index, s_state,
                frontier_state = [],
                i, l, loops = 0,
                childnode,
                fc,
                times = [],
                start,
                end;
                
                while ( !this.frontierEmpty() ) {
                    node = frontier.pop();
                    
                    if ( problem.goalTest( node.state ) ) {
                        console.log("Goal node found: " + node.state);
                        return [node, times, num_explored, num_frontier];
                    }

                    explored[node.state] = node;

                    num_explored += 1; 

                    successors = this.getSuccessors( node );
                   
                    l = successors.length;

                    for (i = 0; i < l; i += 1) {
                        s = successors[i];

                        if (1) { // not in frontier
                            if ( (childnode = explored[s.state]) === undefined) {
                                this.frontierInsert(frontier,s);
                            }
                        } else {
                            if (frontier[fc].fn > s.fn) {
                                frontier[fc] = s;
                            }
                        }
                   } // end for
                    // end = Date.now();
                    // times.push(end - start);
                } // end while


                return false;
            };

            /**
            @method         getNodeIndex
            @param          {Array}     state
            @return         {Number}    index of state in frontier
                            if found, -1 otherwise
            **/
            this.getNodeIndex = function(state) {
                var l = frontier.length,
                i = 0;

                for (i; i < l; i += 1) {
                    if (frontier[i].hasOwnProperty("state") ) {
                        if (frontier[i].state.equals(state)) {
                            return i;
                        }
                    }
                }

                return -1;
            };
            /**
            @method         searchStrategy
            @param          {Array}     frontier 
            @return         {ChildNode} node at top of frontier, 
                            false otherwise
            **/
            this.searchStrategy = function (frontier) {
                if (frontier.length > 0) {
                    return frontier.pop(); 
                } else {
                    return false;
                }
            }; // end of searchStrategy

            
        } // end of AStartGraphSearch

        search.gsearch = function (problem) {
            return new GraphSearch(problem);
        };

        search.astar = function (problem) {
            return new AStarGraphSearch(problem);
        };

        

        return search; 
    } // end of function
);

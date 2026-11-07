/*
 * Restored for appbep.com (2026). Changes from the original:
 *  - NAME_RE is anchored and matches the leaderboard API (3-12 letters, digits, underscores).
 *    It used to accept any text that merely contained three word characters.
 *  - init() resets the move counter; before, it kept counting across games.
 */
define(

    [
        'jquery',
        'lib/nPuzzleProblem', 
        'lib/search', 
        'lib/timer'
    ], 
    
    function ($, problem, search, timer) {

        /**
        * @class            Model
        * @constructor
        * @param            {Object}    problem
        * @param            {Object}    search     
        * @param            {Object     timer
        */
        function Model( problem, search, timer ) {

            /**
             @property {Number} num_moves
             @type     {Number}
             @private
            **/
            var num_moves = 0,

            /**
             @property  astar
             @type      {AStarGraphSearch}
             @private
            **/
            astar,

            /**
            @property   npuzzle_problem
            @type       {NPuzzleProblem}
            @private    
            **/
            npuzzle_problem,

            /**
            @property   moves
            @type       {Number}
            @private
            **/
            moves,

            /**
            @property   init_state
            @private    {Array}
            **/
            init_state = [],
           
            /**
            @property     dimension
            @type         {Number}  
            @private
            **/
            dimension,
           
            /**
            @property       NAME_RE
            @type           {RegExp}
            **/
            NAME_RE = /^\w{3,12}$/;

            /**
            * @class        Moves
            * @constructor
            *
            */
            function Moves() { 
                var id = 1,
                moves = [],
                actions = [];

                this.addMove = function (move) {
                    moves.push({
                        "action":       move,
                        "timestamp":    Date.now(),
                        "id":           id
                    });
                    actions.push(move);
                    id += 1;
                    return this; 
                };

                this.getMoves = function () {
                    return moves;
                };

                this.getNumMoves = function () {
                    return moves.length;
                };

                this.getActions = function () {
                    return actions;
                };
            }

            moves = new Moves();
           
           /**
           * @method       init
           * @param        {Number} dim
           * @param        {String} hfun
           */
            this.init = function ( dim, hfun ) {
                // problem.npuzzle returns a new npuzzle problem
                npuzzle_problem = problem.npuzzle( dim, hfun );
                // dimension sets the dimension of the problem
                dimension = dim;
                // we can get the initial state of the problem
                init_state = npuzzle_problem.getInitState();
                moves = new Moves();
                num_moves = 0;

                return init_state;
            };



           /**
            * @method       initTimerView
            */
            this.initTimerView = function () {
                timer.controller.setMain('#npuzzle-timer');
                timer.controller.initView();
            };


            /**
            * @method       get
            * @return       {Object} a regular object containing data destined
            *               for the server
            *
            */
            this.get = function () {
                return {
                    "moves":        moves.getMoves(),
                    "actions":      moves.getActions(),
                    "num_moves":    num_moves,
                    "time":         timer.controller.getTime(),
                    "time_format":  timer.controller.getTimeFormatted(),
                    "state":        init_state,
                    "dimension":    dimension,
                    "name":         null

                };
            };
                

            /**
            * @method       validateUsername
            * @param        {String} name being sent to the server
            * @return       {Boolean} - true if name is acceptable, false 
            *                otherwise
            */
            this.validateUsername = function (name) {
                var l = name.length;

                if (l === 0 || !NAME_RE.test(name)) 
                    return false;
                else 
                    return true; 
            };

            /**
            * @method       startTimer
            * 
            */
            this.startTimer = function () {
                timer.controller.clear();
                timer.controller.start('#npuzzle-timer');
            };

            /**
            * @method       setInitState
            * @param        {Array} state
            *
            */
            this.setInitState = function (state) {
                npuzzle_problem.setInitState(state);
                init_state = state;
            };

            /**
            * @method       addMove
            * @param        {Number} move
            *
            */
            this.addMove = function (move) {
                moves.addMove(move);
            };

            /**
            * @method       started
            * @return       {Boolean} NPuzzle
            */
            this.started = function () {
                return NPuzzle;
            };

            /**
            * @method       stop
            */
            this.stop = function () {
                timer.controller.pause();
            };
            
            /**
            * @method       search/gener
            * @param        {Array} state;
            * @return       {ChildNode}
            */
            this.search = function ( state ) {
                if (state) {
                    npuzzle_problem.setInitState(state);
                    init_state = state;
                    dimension = Math.sqrt(state.length);
                }

                astar = search.astar(npuzzle_problem); 

                return astar.searchLoop();
            };

            /**
            * @method       getMoves
            * @param        {ChildNode} node - goal node found
            * @return       {Array} array of moves
            */
            this.getMoves = function ( node ) {
                var action = node.action,
                m = [],
                par,
                max_moves = 0;
                 
                m.push(action);
                par = node.parent;

                while (par !== undefined) {
                    m.push(par.action);
                    par =  par.parent; 
                    max_moves += 1;
                    if (max_moves >= 1000) break;
                } 

                return m;
            };

            /**
            * @method       goalTest
            * @param        {Array} state
            * @return       {Boolean} 
            */
            this.goalTest = function (state) {
                return npuzzle_problem.goalTest(state);
            };

            /**
            * @method       getInitState
            * @return       {Array} 
            */
            this.getInitState = function () {
                // return npuzzle_problem.getInitState();
                return init_state;
            };

            /**
            * @method       validState
            * @param        {Array} state
            * @return       {Boolean} 
            */
            this.validState = function (state) {
                return npuzzle_problem.validState(state);
            };

            /**
            * @method       incNumMoves increment the number of moves
            */
            this.incNumMoves = function () {
                num_moves += 1;
            };

            /**
            * @method       getNumMoves
            * @return       {Number} number of moves
            */
            this.getNumMoves = function () {
                return num_moves;
            };

            /**
            * @method       getProblem
            * @return       {Object} 
            */
            this.getProblem = function () {
                return problem;
            };

            /**
            * @method       getSearch
            * @return       {Object} 
            */
            this.getSearch = function () {
                return search;
            };
           

        } // end of Model

        return new Model(problem, search, timer);
    }
);

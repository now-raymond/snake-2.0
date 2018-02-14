// Constants
var Keyboard = {
    // Arrow keys
    PLAYER1_LEFT:   37,
    PLAYER1_UP:     38,
    PLAYER1_RIGHT:  39,
    PLAYER1_DOWN:   40,

    // WASD
    PLAYER2_LEFT:   65,
    PLAYER2_UP:     87,
    PLAYER2_RIGHT:  68,
    PLAYER2_DOWN:   83,

    // IJKL
    PLAYER3_LEFT:   74,
    PLAYER3_UP:     73,
    PLAYER3_RIGHT:  76,
    PLAYER3_DOWN:   75,

    // TFGH
    // Numpad 8456

    // All keycodes
    KEYCODES_LEFT:  [37, 65, 74, 70, 100],
    KEYCODES_UP:    [38, 87, 73, 84, 104],
    KEYCODES_RIGHT: [39, 68, 76, 72, 102],
    KEYCODES_DOWN:  [40, 83, 75, 71, 101]
};

// UNUSED
var Tapzones = {
    PLAYER_1: [0, 1],
    PLAYER_2: [2, 3],
    PLAYER_3: [1],
    PLAYER_4: [3],

    TAPZONES: [[0, 1], [2, 3], [1], [3]]
};

var Direction = {
    LEFT:       "left",
    UP:         "up",
    RIGHT:      "right",
    DOWN:       "down"
};

var SnakeEffectsEnum = {
    None:               "none",             // No effect
    Food:               "food",
    Invincible:         "invincible",
    Instakill:          "instakill",        // Snake with this effect can kill other snakes it touches.
    InverseControls:    "inverseControls",  // Snakes with this debuff will have their controls reversed.
    EatSnake:           "eatSnake"          // Snakes with this effect can consume units from other snakes (but the other snake doesn't die.)
};

var SnakeEffects = {
    effects:    [SnakeEffectsEnum.Food, SnakeEffectsEnum.Invincible, SnakeEffectsEnum.Instakill],
    weights:    [0.5, 0.1, 0.4],    // The probability that each item will come up.
    colours:    ["white", "goldenrod", "red", "yellow"],
    duration:   [0, 10000, 10000]         // How long each effect lasts, in milliseconds.
};

var PlayerColours = ["#00AAFF", "#FF00AA", "#AAFF00", "#FFAA00", "#AA00FF", "cyan", "magenta", "turquoise"];
var PlayerStartingDirectionArray = [Direction.RIGHT, Direction.LEFT, Direction.UP, Direction.DOWN]; // This is the order we want each player's snakes to start to move when initialised. 1st player moves right, 2nd player moves left etc.

// Configuration
var Config = {
    players:                        4,      // TODO: dynamically set
    speed:                          25,     // Not dynamic right now: frames per second of the game - 25
    speedScaleFactor:               0.04,   // Unused right now. The game speed will be the window height or width, whichever is smaller, multiplied by this scale factor.
    maxSpeed:                       25,     // If speed (based on screen size) is calculated to be more than this value, the value is clamped to this value.
    defaultSize:                    15,     // Default size for if screen density ratio is 1.
    size:                           15,     // DYNAMIC: the width and height, in pixels, of one square of the snake. This value is equals to defaultSize multiplied by screen density ratio.
    startingSnakeLength:            10,     // DYNAMIC: Starting length of the snake. This is dynamically set according to the screen size and the factor below.
    startingSnakeLengthScaleFactor: 0.015,  // The starting snake length will be the window height or width, whichever is smaller, multiplied by this scale factor.
    endGameTimer:                   500,    // How many ms to wait after the endgame condition before stopping the game and showing the scoreboard
    effectExpireWarningLength:      3600,   // How many ms before a snake effect ends to warn the player. Player colour will blink every 200ms, this must be a multiple of it.
    deadSnakeColour:                "grey",
    backgroundColour:               "black"
};

// Get references to audio
var Audio = {
    main_music: document.getElementById("game_music")
};

// Get references to UI
var UI = {
    mainMenu:       document.getElementById("mainMenu"),
    scoreBoard:     document.getElementById("scoreboard"),
    message:        document.getElementById("message"),
    gameOverText:   document.getElementById("gameOverText"),
    starImage:      document.getElementById("img_star")
};

// Initialise the Canvas!
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var Game = function() {
    // --------- [ Objects ] ---------

    // A Snake object - represents a single snake.
    var Snake = function(snakeColour) {
        // The colour of the snake
        this.colour = snakeColour;
        // Whether or not this snake is alive.
        this.alive = true;
        // An array of coordinate pairs, {x, y}, holding all the places this snake has been.
        this.positionHistory = [];
        // Stores the current direction that this snake is heading.
        this.currentDirection = "";
        // Stores the current powerup / debuff that this snake has.
        this.activeEffect = SnakeEffectsEnum.None;
        // This is an override for the colour that will be painted for the head and tail of the snake. Used to show if the snake has a powerup.
        this.headTailsColour = snakeColour;
        // Stores the interval / timeout IDs for setInterval and clearInterval for the powerup timers.
        this.timers = {
            effectExpireWarning:        null,
            effectExpireWarningFlash:   null,
            effectExpire:               null
        };
        // Stores the indexes of the snakes this snake has killed.
        this.killedSnakes = [];
    };

    /**
     * Apply an effect onto the snake.
     * Automatically handles effect expiry warning and effect expiry.
     * @param effect The effect that should be the new active effect of the snake.
     */
    Snake.prototype.applyEffect = function(effect) {
        var _this = this;   // Keep a reference of "this" around for the timer functions to access the snake.

        // Clear all running intervals / timers for this snake object because we're going to override it with the new effect and restart them.
        clearTimeout(this.timers.effectExpireWarning);
        clearInterval(this.timers.effectExpireWarningFlash);
        clearTimeout(this.timers.effectExpire);

        var effectIndex = SnakeEffects.effects.indexOf(effect);
        this.activeEffect = effect;
        this.headTailsColour = SnakeEffects.colours[effectIndex];   // Set the head and tail of the snake to our power up colour.

        // Set timer for warning flash.
        this.timers.effectExpireWarning = setTimeout(function() {
            _this.timers.effectExpireWarningFlash = setInterval(function() {
                // Flip the first and last unit of the snake between the snake's colour and the powerup colour.
                if (_this.headTailsColour == SnakeEffects.colours[effectIndex]) {
                    _this.headTailsColour = "grey";
                } else {
                    _this.headTailsColour = SnakeEffects.colours[effectIndex];
                }
            }, 200);
        }, SnakeEffects.duration[effectIndex] - Config.effectExpireWarningLength);

        // Set timer for deactivation.
        this.timers.effectExpire = setTimeout(function() {
            clearInterval(_this.timers.effectExpireWarningFlash);
            _this.activeEffect = SnakeEffectsEnum.None;
            _this.headTailsColour = _this.colour;
            console.log("Effect expired.");
        }, SnakeEffects.duration[effectIndex]);
    };

    // A Food object representing a food item! Can possibly be a powerup.
    var Food = function() {
        // TODO: must be careful not to put the food at where a dead snake is. Though it's unlikely, this function doesn't do any checking right now.
        this.x = getRandomInt(0, canvas.width/Config.size);
        this.y = getRandomInt(0, canvas.height/Config.size);
        this.effect = SnakeEffectsEnum.Instakill;
    };

    // --------- [ Game State ] ---------
    var snakes = [];
    var foods = [];  // List of all food items on-screen.
    var orderOfDeath = [];  // The order in which each snake died. Holds indexes into snakes[].
    var lastSnakeStanding = -1;
    var gameEnded = false;
    var gameEnding = false; // For when endgame condition is satisfied (<=1 snake alive), but we continue updating the screen for a few more seconds, but stop checking and updating the last snake alive.
    var messageTimerID = null;  // For holding the timer ID when fading out messages.
    var ongoingTouches = [];   // list of active touches on the screen (to support mobile devices)

    /*
     * Resets all game state variables to their default.
     * Called after the end of a game, to prepare the game for a new round.
     */
    function resetGame() {
        snakes = [];
        foods = [];
        orderOfDeath = [];
        lastSnakeStanding = -1;
        gameEnded = false;
        gameEnding = false;
        messageTimerID = null;
        ongoingTouches = [];
    }

    function initSnakes(numPlayers) {
        var canvasVerticalCenter    = Math.floor(canvas.height/2/Config.size);
        var canvasHorizontalCenter  = Math.floor(canvas.width/2/Config.size);

        // This collection of offsets is for offsetting the snakes so that they're not on a collision course with each other at the start, and for if more than 4 players are playing.
        var offsets = {
            right:  1,
            left:   -1,
            up:     1,
            down:   -1
        };

        for (var i=0; i<numPlayers; i++) {
            // For each player...
            var directionIndex = i % 4;    // gives 0, 1, 2, 3 in cyclic order i.e. when i=5, directionIndex = 0 again.

            var snake = new Snake(PlayerColours[i]);
            snake.currentDirection = PlayerStartingDirectionArray[directionIndex];

            // Create the initial length of the snake and position them.
            // Vertical middle of canvas:   Math.floor(y = canvas.height/2/Config.size)
            // Horizontal middle of canvas: Math.floor(x = canvas.width/2/Config.size)

            switch (snake.currentDirection) {
                // Player 1
                default:
                case Direction.RIGHT:
                    // Place snake in vertical middle and left side of canvas.
                    for (var j=0; j<Config.startingSnakeLength; j++) {
                        snake.positionHistory.unshift({
                            x: j,
                            y: offsets.right + canvasVerticalCenter
                        });
                    }
                    offsets.right += getRandomInt(-15, 15); // TODO: watch out, if > 8 people playing there may be a collision at the beginning. Create a findOffset function to ensure no collision.
                    break;
                // Player 2
                case Direction.LEFT:
                    // Place snake in vertical middle and right side of canvas.
                    for (j=0; j<Config.startingSnakeLength; j++) {
                        snake.positionHistory.unshift({
                            x: canvas.width/Config.size-1 - j,
                            y: offsets.left + canvasVerticalCenter
                        });
                    }
                    offsets.left += getRandomInt(-15, 15);
                    break;
                // Player 3
                case Direction.UP:
                    // Place snake in horizontal middle and bottom of canvas.
                    for (j=0; j<Config.startingSnakeLength; j++) {
                        snake.positionHistory.unshift({
                            x: offsets.up + canvasHorizontalCenter,
                            y: canvas.height/Config.size-1 - j
                        });
                    }
                    offsets.up += getRandomInt(-15, 15);
                    break;
                // Player 4
                case Direction.DOWN:
                    // Place snake in horizontal middle and top of canvas.
                    for (j=0; j<Config.startingSnakeLength; j++) {
                        snake.positionHistory.unshift({
                            x: offsets.down + canvasHorizontalCenter,
                            y: j
                        });
                    }
                    offsets.down += getRandomInt(-15, 15);
                    break;
            }

            snakes.push(snake);
        }

        // Now create a food item
        foods.push(new Food());

        console.log("Game set for " + numPlayers + " players.");
        console.log(snakes);
    }

    // This is the render loop!
    function draw() {
        if (!gameEnded) {
            drawBackground();
            updateSnake();
            drawSnake();
            drawFood();
            //drawPlayerLabels();
            if (!gameEnding) checkGameEnded();

            setTimeout(function () {
                requestAnimationFrame(draw);
            }, 1000 / Config.speed);
        } else {
            // Disable input capture so that user can hit restart.
            document.removeEventListener("touchstart", touchStartHandler);
            document.removeEventListener("touchend", touchEndHandler);
            // Show gameover screen.
            fadeoutAudio(Audio.main_music);
            drawEndgame();
        }
    }

    function drawBackground() {
        ctx.fillStyle = Config.backgroundColour;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawSnake() {
        for (var i=0; i<snakes.length; i++) {
            // For each player...
            for (var j=0; j<snakes[i].positionHistory.length; j++) {
                // For each location that the snake has been through, paint the snake's colour.
                var coords = snakes[i].positionHistory[j];

                if (snakes[i].alive) {
                    if (j == 0 || j == snakes[i].positionHistory.length-1) {
                        ctx.fillStyle = snakes[i].headTailsColour;
                    } else {
                        ctx.fillStyle = snakes[i].colour;
                    }
                } else {
                    ctx.fillStyle = Config.deadSnakeColour;
                }

                ctx.fillRect(coords.x * Config.size, coords.y * Config.size, Config.size, Config.size);
                ctx.strokeRect(coords.x * Config.size, coords.y * Config.size, Config.size, Config.size);
            }
        }
    }

    function drawFood() {
        for (var i=0; i<foods.length; i++) {
            // For each food item
            var food = foods[i];

            // If food item is no longer within screen bounds, recreate it. (can become outside of screen bounds if window resized).
            if (food.x >= canvas.width/Config.size || food.y >= canvas.height/Config.size) {
                food = new Food();
                foods[i] = food;
            }

            ctx.fillStyle = "white";
            ctx.fillRect(food.x * Config.size, food.y * Config.size, Config.size, Config.size);
        }
    }

    /**
     * Draws a white label above each player so that they know which snake they are.
     */
    function drawPlayerLabels() {
        for (var i=0; i<snakes.length; i++) {
            // For each player...

            var centerIndex = Math.round(snakes[i].positionHistory.length/2);
            ctx.font = 72 * (Config.size / Config.defaultSize) + "px Sabo-Regular";

            if (Math.abs(snakes[i].positionHistory[0].x - snakes[i].positionHistory[1].x) > 0) {
                // Horizontal snake - one square above the center
                ctx.textAlign = "center";
                //ctx.textBaseline = "bottom";
                ctx.fillText((i+1), snakes[i].positionHistory[centerIndex].x * Config.size, snakes[i].positionHistory[centerIndex].y * Config.size - Config.size);
            } else if ((snakes[i].positionHistory[0].y - snakes[i].positionHistory[1].y) < 0) {
                // Vertical snake facing upwards - one square to the left, and 1.5 squares below the center.
                ctx.textAlign = "right";
                ctx.textBaseline = "bottom";
                ctx.fillText((i+1), snakes[i].positionHistory[centerIndex].x * Config.size - Config.size, snakes[i].positionHistory[centerIndex].y * Config.size + 1.5*Config.size);
            } else if ((snakes[i].positionHistory[0].y - snakes[i].positionHistory[1].y) > 0) {
                // Vertical snake facing downwards - one square to the left, and 1.5 squares above the center.
                ctx.textAlign = "right";
                ctx.textBaseline = "top";
                ctx.fillText((i+1), snakes[i].positionHistory[centerIndex].x * Config.size - Config.size, snakes[i].positionHistory[centerIndex].y * Config.size - 1.5*Config.size);
            }
        }

        // Draw "Get Ready!" at a fontsize that fits the display. Max fontsize 60.
        var fontSize = 61;
        var text = "Ready?";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        do {
            fontSize--;
            ctx.font = fontSize * (Config.size / Config.defaultSize) + "px Sabo-Regular";
        } while (ctx.measureText(text).width > canvas.width*0.4);

        ctx.fillText(text, canvas.width/2, canvas.height/2);

        console.log("Font size chosen for text: " + fontSize);
    }

    // Calculates positions of snakes
    function updateSnake() {
        var snake;
        var head_x;
        var head_y;

        // Move all live snakes
        for (var i=0; i<snakes.length; i++) {
            snake = snakes[i];
            if (snake.alive) {
                head_x = snake.positionHistory[0].x;
                head_y = snake.positionHistory[0].y;

                // DEBUG only - warn if there are any fractional numbers in head_x and y
                if (head_x % 1 != 0) console.log("WARNING: head_x not integer.");
                if (head_y % 1 != 0) console.log("WARNING: head_y not integer.");

                // Move the snake along its current direction.
                switch (snake.currentDirection) {
                    case Direction.LEFT:
                        head_x--;
                        break;
                    case Direction.UP:
                        head_y--;
                        break;
                    case Direction.RIGHT:
                        head_x++;
                        break;
                    case Direction.DOWN:
                        head_y++;
                        break;
                }

                // Wrap walls
                if (head_x >= canvas.width/Config.size)         head_x = 0;
                else if (head_x < 0)                            head_x = Math.floor(canvas.width/Config.size);
                else if (head_y >= canvas.height/Config.size)   head_y = 0;
                else if (head_y < 0)                            head_y = Math.floor(canvas.height/Config.size);

                // Move snake
                var tail = snake.positionHistory.pop();
                tail.x = head_x;
                tail.y = head_y;
                snake.positionHistory.unshift(tail);
            }
        }

        // Check for collisions for live snakes.
        for (i=0; i<snakes.length; i++) {
            snake = snakes[i];
            if (!snake.alive) continue;

            head_x = snake.positionHistory[0].x;
            head_y = snake.positionHistory[0].y;

            // --- [ FOOD COLLISION ] ---
            for (j = 0; j < foods.length; j++) {
                if (head_x == foods[j].x && head_y == foods[j].y) {
                    // We've hit a food item!
                    // Give the player the effect of the food item, if any.
                    if (foods[j].effect != SnakeEffectsEnum.Food) {
                        var effectIndex = SnakeEffects.effects.indexOf(foods[j].effect);
                        snake.applyEffect(SnakeEffects.effects[effectIndex]);
                        console.log("Player " + (i+1) + " obtained " + SnakeEffects.effects[SnakeEffects.effects.indexOf(foods[j].effect)] + "!");
                        displayMessage("Player " + (i+1) + " obtained " + SnakeEffects.effects[SnakeEffects.effects.indexOf(foods[j].effect)] + "!");
                    }
                    // Remove the piece of food that was consumed from the screen.
                    foods.splice(j, 1);
                    // Put another piece of food into the game.
                    foods.push(new Food());
                    // Lengthen the snake
                    snake.positionHistory.unshift({x: head_x, y: head_y});
                }
            }

            // --- [ COLLISION WITH OTHER SNAKES ] ---
            // Check head collision with body parts of other snakes.
            // If collision, snake turns grey and stops.
            for (var j=0; j<snakes.length; j++) {
                // Don't need to check against itself.
                if (i == j)       continue;

                var otherSnake = snakes[j];

                // Check for collisions between the head of this snake and the bodies of the other snakes. Still include k=0 to check for head of dead snakes.
                for (var k=0; k<otherSnake.positionHistory.length; k++) {
                    if (head_x == otherSnake.positionHistory[k].x && head_y == otherSnake.positionHistory[k].y) {
                        // If we're here, a collision occurred!

                        if (snake.activeEffect == SnakeEffectsEnum.Instakill) {
                            // [SNAKE HAS INSTAKILL] If this snake has the Instakill effect we kill the snake that he touches.
                            if (otherSnake.alive) {
                                otherSnake.alive = false;
                                snake.killedSnakes.push(j);
                                orderOfDeath.push(j);
                                console.log("Player " + (i + 1) + " killed Player " + (j + 1) + "!");
                                displayMessage("Player " + (i + 1) + " killed Player " + (j + 1) + "!");
                            }
                            otherSnake.positionHistory.splice(k, 1);    // Remove the other snake's part that this snake ate.
                            snake.positionHistory.unshift({x: head_x, y: head_y}); // And lengthen this snake

                        } else if (k == 0 && otherSnake.alive && otherSnake.activeEffect != SnakeEffectsEnum.Instakill) {
                            // [HEAD-ON COLLISION] k == 0 means we're looking at a collision between two snake heads. Both die in this case.
                            snake.alive = false;
                            otherSnake.alive = false;
                            orderOfDeath.push(i);
                            orderOfDeath.push(j);
                            console.log("Player " + (i + 1) + " and " + (j + 1) + " died due to a head-on collision!");
                            break;

                        } else {
                            // [ALL OTHER CASES] Else we kill this snake.
                            snake.alive = false;
                            snake.positionHistory.shift();  // Pop off the head of the snake that collided.
                            otherSnake.killedSnakes.push(i);
                            orderOfDeath.push(i);
                            console.log("Player " + (i + 1) + " died colliding into Player " + (j + 1) + "!");
                            //displayMessage("Player " + (i + 1) + " died colliding into Player " + (j + 1) + "!");
                            break;
                        }
                    }
                }
            }
        }
    }

    function checkGameEnded() {
        var numSnakesAlive = 0;

        var lastSnakeAlive = -1;
        for (var i=0; i<snakes.length; i++) {
            if (snakes[i].alive) {
                lastSnakeAlive = i;
                numSnakesAlive++;
            }
        }

        if (numSnakesAlive <= 1){
            gameEnding = true;
            lastSnakeStanding = lastSnakeAlive;

            setTimeout(function() {
                gameEnded = true;
            }, Config.endGameTimer);
        }
    }

    function drawEndgame() {
        // Show endgame screen.
        UI.scoreBoard.style.display = 'block';

        if (lastSnakeStanding != -1) {
            UI.gameOverText.innerHTML = "Player " + (lastSnakeStanding + 1) + " wins!";
        } else {
            UI.gameOverText.innerHTML = "Game over!";
        }

        console.log("Game ended!");
        console.log("Game summary:");
        console.log("Number of players: " + snakes.length);
        displayMessage("Nice.");

        var player_with_most_kills  = -1;
        var player_longest_snake    = -1;
        var max_kills               = -1;
        var longest_snake           = -1;

        for (var i=0; i<snakes.length; i++) {
            if (snakes[i].killedSnakes.length > max_kills) {
                max_kills = snakes[i].killedSnakes.length;
                player_with_most_kills = i+1;
            }
            if (snakes[i].positionHistory.length > longest_snake) {
                longest_snake = snakes[i].positionHistory.length;
                player_longest_snake = i+1;
            }
            console.log("Player " + (i+1) + " killed " + snakes[i].killedSnakes.length + " snakes and had a length of " + snakes[i].positionHistory.length + ".");
        }

        console.log("The player with most kills is Player " + player_with_most_kills + " with " + max_kills + " kills.");
        console.log("The player with the longest snake is Player " + player_longest_snake + " with a length of " + longest_snake + ".");

        var orderOfDeathString = "The order of death was Players ";
        for (i=0; i<orderOfDeath.length-1; i++) {
            orderOfDeathString += (orderOfDeath[i] + 1) + ", ";
        }
        orderOfDeathString += (orderOfDeath[orderOfDeath.length-1] + 1) + ".";
        console.log(orderOfDeathString);
    }

    function changeSnakeDirection(snakeIndex, direction) {
        if (snakeIndex < snakes.length && direction != getInverseDirection(snakes[snakeIndex].currentDirection)) {
            snakes[snakeIndex].currentDirection = direction;
        }
    }

    function keyDownHandler(e) {
        //console.log("Key down: " + e.keyCode);

        var left_playerIndex   = Keyboard.KEYCODES_LEFT.indexOf(e.keyCode);
        var up_playerIndex     = Keyboard.KEYCODES_UP.indexOf(e.keyCode);
        var right_playerIndex  = Keyboard.KEYCODES_RIGHT.indexOf(e.keyCode);
        var down_playerIndex   = Keyboard.KEYCODES_DOWN.indexOf(e.keyCode);

        if (left_playerIndex != -1) {
            changeSnakeDirection(left_playerIndex, Direction.LEFT);
        } else if (up_playerIndex != -1) {
            changeSnakeDirection(up_playerIndex, Direction.UP);
        } else if (right_playerIndex != -1) {
            changeSnakeDirection(right_playerIndex, Direction.RIGHT);
        } else if (down_playerIndex != -1) {
            changeSnakeDirection(down_playerIndex, Direction.DOWN);
        }
    }

    function touchStartHandler(e) {
        e.preventDefault();
        var touches = e.changedTouches;

        for (var i=0; i<touches.length; i++) {
            ongoingTouches.push(copyTouch(touches[i]));
            //console.log("touch start at x: " + touches[i].clientX + " y: " + touches[i].clientY);
        }
    }

    function touchEndHandler(e) {
        e.preventDefault();
        var touches = e.changedTouches;

        for (var i=0; i<touches.length; i++) {
            var touchIndex = ongoingTouchIndexById(touches[i].identifier);

            var deltaX = touches[i].clientX - ongoingTouches[touchIndex].clientX;
            var deltaY = touches[i].clientY - ongoingTouches[touchIndex].clientY;

            // Check which direction has the largest movement.
            var direction = -1;
            var maxDirectionDelta = 0;

            if (deltaX > maxDirectionDelta) {
                direction = Direction.RIGHT;
                maxDirectionDelta = deltaX;
            }
            if (deltaY > maxDirectionDelta) {
                direction = Direction.DOWN;
                maxDirectionDelta = deltaY;
            }
            if (-deltaX > maxDirectionDelta) {
                direction = Direction.LEFT;
                maxDirectionDelta = -deltaX;
            }
            if (-deltaY > maxDirectionDelta) {
                direction = Direction.UP;
                maxDirectionDelta = -deltaY;
            }

            if (direction != -1) {
                console.log("Direction of swipe: " + direction);

                var top = false;
                var bottom = false;
                var left = false;
                var right = false;

                if (ongoingTouches[touchIndex].clientY < window.innerHeight / 2) {
                    console.log("touch occurred on top half");
                    top = true;
                } else {
                    console.log("touch occurred on bottom half");
                    bottom = true;
                }
                if (ongoingTouches[touchIndex].clientX < window.innerWidth / 2) {
                    console.log("touch occurred on left half");
                    left = true;
                } else {
                    console.log("touch occurred on right half");
                    right = true;
                }

                if (snakes.length <= 2) {
                    if (bottom)             changeSnakeDirection(0, direction); // Player 1
                    if (top)                changeSnakeDirection(1, direction); // Player 2
                } else if (snakes.length == 3) {
                    if (bottom && left)     changeSnakeDirection(0, direction); // Player 1
                    if (bottom && right)    changeSnakeDirection(1, direction); // Player 2
                    if (top)                changeSnakeDirection(2, direction); // Player 3
                } else if (snakes.length > 3) {
                    if (bottom && left)     changeSnakeDirection(0, direction); // Player 1
                    if (bottom && right)    changeSnakeDirection(1, direction); // Player 2
                    if (top && left)        changeSnakeDirection(2, direction); // Player 3
                    if (top && right)       changeSnakeDirection(3, direction); // Player 4
                }
            }

            // Remove from ongoing touches list.
            ongoingTouches.splice(touchIndex, 1);
        }
    }

    function resizeHandler(event) {
        console.log("Window resized.");
        fitCanvasToScreen();
    }

    function init() {
        resetGame();
        console.log("Game init");
        fitCanvasToScreen();
        Config.startingSnakeLength  = Math.floor(Math.min(window.innerWidth, window.innerHeight) * Config.startingSnakeLengthScaleFactor);
        //Config.speed                = Math.floor(Math.min(window.innerWidth, window.innerHeight) * Config.speedScaleFactor);
        if (Config.speed > Config.maxSpeed) Config.speed = Config.maxSpeed;
        initSnakes(Config.players);
        document.addEventListener("keydown", keyDownHandler);
        document.addEventListener("touchstart", touchStartHandler);
        document.addEventListener("touchend", touchEndHandler);
        window.addEventListener("resize", resizeHandler);

        // Draw a static frame for the background and snake for the countdown!
        drawBackground();
        drawSnake();
        drawFood();
        drawPlayerLabels();

        UI.scoreBoard.style.display = 'none';  // hide scoreboard, for when restarting from endgame.
        UI.mainMenu.style.display = 'none';    // hide menu
        Audio.main_music.volume = 1;
        Audio.main_music.play();

        // Give the players a 2s delay before starting the game for them to see which snakes they're controlling.
        setTimeout(function() {
            draw(); // kick off render loop
        }, 2000);
        /*Audio.main_music.volume = 1;
        Audio.main_music.play();*/
    }

    // Utilities
    function getInverseDirection(direction) {
        switch (direction) {
            case Direction.LEFT:
                return Direction.RIGHT;
            case Direction.UP:
                return Direction.DOWN;
            case Direction.RIGHT:
                return Direction.LEFT;
            case Direction.DOWN:
                return Direction.UP;
        }
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    /**
     * Make the game full width and height of the container.
     */
    function fitCanvasToScreen() {
        // Original code - doesn't scale up for high DPI devices.
        //canvas.width = Math.floor(window.innerWidth / Config.size) * Config.size;
        //canvas.height = Math.floor(window.innerHeight / Config.size) * Config.size;

        // For high density devices (i.e. mobile), scale according to screen density.
        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                                ctx.mozBackingStorePixelRatio ||
                                ctx.msBackingStorePixelRatio ||
                                ctx.oBackingStorePixelRatio ||
                                ctx.backingStorePixelRatio || 1;

        var ratio = devicePixelRatio / backingStoreRatio;

        Config.size = Config.defaultSize * ratio;

        var w = Math.floor(window.innerWidth / Config.size) * Config.size;
        var h = Math.floor(window.innerHeight / Config.size) * Config.size;

        // Scale up the canvas to the actual device density.
        canvas.width    = w * ratio;
        canvas.height   = h * ratio;

        // Downscale the canvas to fit onto the screen, but with high density.
        canvas.style.width  = w;
        canvas.style.height = h;

        console.log("Window ratio is: " + ratio);
    }

    function fadeoutAudio(audio) {
        setTimeout(fadeout, 100);

        function fadeout() {
            if (gameEnded) {
                var prevVolumeLevel = audio.volume;
                if (audio.volume >= 0.10) {
                    audio.volume -= 0.10;
                    if (audio.volume != prevVolumeLevel) {
                        setTimeout(fadeout, 100);
                    } else {
                        // The host doesn't support changing volume. Only happens on iOS.
                        audio.pause();
                    }
                } else {
                    audio.pause();
                }
            }
        }
    }

    /**
     * Displays a message onto the screen.
     * Display time is currently hardcoded at 2s, and fadeout will take 1s.
     * @param message
     */
    function displayMessage(message) {
        UI.message.innerHTML = message;
        UI.message.style.visibility = "visible";
        UI.message.style.transition = "opacity 0.2s";
        UI.message.style.opacity = 1;

        clearTimeout(messageTimerID);   // Don't do any fadeouts scheduled earlier if we're replacing the message.
        messageTimerID = setTimeout(fadeout, 2000);

        function fadeout() {
            UI.message.style.transition = "opacity 1s";
            UI.message.style.opacity = 0;
            messageTimerID = setTimeout(function() {
                UI.message.style.visibility = "hidden";
            }, 1000);
        }
    }

    // Touch Utilities

    // Copy the bits of info about the touch we're interested about instead of grabbing the entire object.
    function copyTouch(touch) {
        return { identifier: touch.identifier, clientX: touch.clientX, clientY: touch.clientY };
    }
    // Scans through the touches array to find the touch matching the given identifier, then returns that touch's index into the array
    function ongoingTouchIndexById(idToFind) {
        for (var i = 0; i < ongoingTouches.length; i++) {
            var id = ongoingTouches[i].identifier;

            if (id == idToFind) {
                return i;
            }
        }
        return -1;    // not found
    }

    this.startGame = function() {
        init();
    };
};

var game = new Game();
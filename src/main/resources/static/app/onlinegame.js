// Globals (use sparingly)

var controller;
var renderer;

function register() {
	renderer = new Renderer(document.getElementById("gameBoard"));
	controller = new Controller();
	controller.register();
}

function move(dir) {
	controller.move(dir);
}

function toggleGrid() {
	renderer.toggleGrid();
}


// Controller Code

var Controller = function() {
	/**
	 * Private Members
	 */ 
	var ws;
	var sessionInfo;
	var gameModel;
	var board = {
			heightPerPiece: 0,
			widthPerPiece: 0,
			heightInPieces: 0,
			widthInPieces: 0,
			topLeft: {},
			bottomRight: {}
	}
	
	var MAX_ZOOM_IN = 8;
	var MAX_ZOOM_OUT = 30;
	
	function connect(wsAddr) {
		ws = new WebSocket(wsAddr);
		
		ws.onmessage = function (data) {
			//console.log(data.data);
			gameModel = JSON.parse(data.data);
			board.topLeft.x = gameModel.topLeftX;
			board.topLeft.y = gameModel.topLeftY;
			renderer.showGreeting(new Date(gameModel.update));
		}

		ws.onopen = function() {
			send(sessionInfo);
		}
	}
	
	function disconnect() {
	    if (w != null) {
	        ws.close();
	    }
	    console.log("Disconnected");
	}
	
	function send(msg) {
		ws.send(JSON.stringify(msg));
	}
	function buildStub(action) {
		
		var msg = {};
		msg.detail = {}
		msg.detail.type = action;
		msg.userName = sessionInfo.userName;
		msg.whichBoard = sessionInfo.whichBoard;
		
		return msg;
	}
	function moveMap(x, y) {
		console.log("Moving to Actual " + x + "," + y);
		var msg = buildStub("mappan");
		msg.x = x;
		msg.y = y;
		
		send(msg);
	}
	
	function loadBoardCharacteristics(topX, topY) {
		
		var cSize = renderer.getCanvasHeightWidth();
		
		board.heightPerPiece = 100;
		board.widthPerPiece = 100;
		board.heightInPieces = cSize.height/board.heightPerPiece;
		board.widthInPieces = cSize.width/board.widthPerPiece;
		
		board.topLeft = {
			x: topX,
			y: topY
		}
		
		board.bottomRight = {
			x: board.topLeft.x + cSize.width,
			y: board.topLeft.y + cSize.height
		}
		
	}
	
	function initialLoadBoard(topLeftX, topLeftY, whichBoard, wsLocation) {
		
		renderer.registerEventHandlers();
		renderer.buildMoveButtons();

		loadBoardCharacteristics(topLeftX, topLeftY);
		sessionInfo.height =board.heightInPieces;
		sessionInfo.width = board.widthInPieces;
		
		$.get("/gameboard/" + whichBoard, {
			topLeftX:board.topLeft.x,
			topLeftY:board.topLeft.y,
			height: board.heightInPieces,
			width: board.widthInPieces
			}, function(data, status) {
				gameModel = data;
				connect(wsLocation);
				renderer.render();
		});
		
	}
	
	
	return {
		/**
		 * Public Members
		 */
		register: function() {
			var cSize = renderer.getCanvasHeightWidth();
			$.get("/register", {height: cSize.height/100, width: cSize.width/100}, function(data, status) {
				sessionInfo = data;
				initialLoadBoard(data.topLeftX, data.topLeftY, data.whichBoard, data.wsLocation);
			});
		},
		getBoard: function() {
			return board;
		},
		setGameModel: function(gm) {
			gameModel = gm;
		},
		getGameModel: function() {
			return gameModel;
		},
		getSessionInfo: function() {
			return sessionInfo;
		},
		sendMsg: function(msg) {
		   	send(msg);
		},
		buildMsgStub: function(action) {
			return buildStub(action);
		},
		move: function(dir) {
			
			if (dir === "up" && board.topLeft.y > 0) {
				moveMap(board.topLeft.x, board.topLeft.y - 1);
			} else if (dir === "down") {
				moveMap(board.topLeft.x, board.topLeft.y + 1);
			} else if (dir === "left" && board.topLeft.x > 0) {
				moveMap(board.topLeft.x - 1, board.topLeft.y);
			} else if (dir === "right") {
				moveMap(board.topLeft.x + 1, board.topLeft.y);
			} else {
				console.log("Illegal move");
			}
			
		},

		whichActualTile: function(pos) {
			var rel = controller.whichRelativeTile(pos);
			
			return controller.relativeToActual(rel);
		},
		whichRelativeTile: function(pos) {
			return {
				x: Math.floor(pos.x/board.heightPerPiece),
				y: Math.floor(pos.y/board.heightPerPiece)
			};
		},
		tileSelected: function(x,y) {
			gameModel.pieces.forEach(function(piece) {
				if (piece.x === x && piece.y === y) {
					var btns = "<b>Land Owned by: " + ((piece.owner != null) || "No one") + "<p><p>";
					if (piece.item === 1 || piece.item === 2) {
						btns += "<button name=\"downBtn\" id=\"downBtn\" onClick=\"move('down'); \" type=\"button\" class=\"btn\">Build Knight</button>";
					}
					if (piece.item === 3) {
						btns += "<button name=\"downBtn\" id=\"downBtn\" onClick=\"move('down'); \" type=\"button\" class=\"btn\">Build Mine</button>";
					}
					if (piece.item === 4 || piece.item === 5 ) {
						btns += "<button name=\"downBtn\" id=\"downBtn\" onClick=\"move('down'); \" type=\"button\" class=\"btn\">Build Lumber Mill</button>";
					}
					
					$("#options").html(btns);
				}
			});
		},
		xToPixel: function(pieceX) {
			var relativeX = pieceX - board.topLeft.x;
			return relativeX * board.widthPerPiece;
		},

		yToPixel: function(pieceY) {
			var relativeY = pieceY - board.topLeft.y;
			return relativeY * board.heightPerPiece;
		},

		relativeToActual: function(relativeXy) {
			return {
				x: relativeXy.x + board.topLeft.x,
				y: relativeXy.y + board.topLeft.y
			}
		},

		actualToRelative: function(actualXy) {
			return {
				x: actualXy.x - board.topLeft.x,
				y: actualXy.y - board.topLeft.y
			}
		},
		zoom: function(where) {
			if (((where > 0) && (board.heightInPieces > MAX_ZOOM_IN || board.widthInPieces > MAX_ZOOM_IN)) || 
				((where < 0) && (board.heightInPieces < MAX_ZOOM_OUT || board.widthInPieces < MAX_ZOOM_OUT))	) {
				if (where > 0) {
					board.heightPerPiece = board.heightPerPiece + 1;
					board.widthPerPiece = board.widthPerPiece + 1;
				} else {
					board.heightPerPiece = board.heightPerPiece - 1;
					board.widthPerPiece = board.widthPerPiece - 1;
				}
				var cSize = renderer.getCanvasHeightWidth();
				board.heightInPieces = Math.ceil(cSize.height / board.heightPerPiece);
				board.widthInPieces = Math.ceil(cSize.width / board.widthPerPiece);
				
				console.log("new height: " + board.heightInPieces + "::new width: " + board.widthInPieces)
				
				var msg = buildStub("zoom");
				msg.x = 0;
				msg.y = 0;
				msg.detail.newHeight = board.heightInPieces
				msg.detail.newWidth = board.widthInPieces;
				
				send(msg);
			} else {
				console.log("Max zoom reached");
			}
		}
	}
};

//Renderer Code

var Renderer = function(c) {
	
	/**
	 * Private Members
	 */
	var canvas = c;
	var ctx = canvas.getContext("2d");
	
	var grid = false;
	var selected;
	var hover;
	
	var castle1 = new Image();   
	castle1.src = 'images/images-castle-clipart-830x717.png';

	var castle2 = new Image();   
	castle2.src = 'images/Castle_Zoom.png';

	var mountain = new Image();   
	mountain.src = 'images/Mountain-Clipart-PNG-02.png';
	
	var forest = new Image();   
	forest.src = 'images/Trees_1.png';
	
	var forest2 = new Image();   
	forest2.src = 'images/Trees_2.png';
	
	function getMousePos(e) {
		return {
			x: e.clientX - canvas.getBoundingClientRect().left,
			y: e.clientY - canvas.getBoundingClientRect().top
		};
	}

	function onDrag(e) {
		console.log(e.clientX + " " + e.clientY);
	}
	
	function onMouseOver(e) {
		var pos = getMousePos(e);
		var rel = controller.whichRelativeTile(pos);
		
		hover = rel;
	}
	
	function onMouseWheel(e) {
		
		controller.zoom(e.wheelDelta/120);
		 if ((e.wheelDelta/120) > 0) {
			 console.log("Zooming in to " + e.clientX + " " + e.clientY);
		 } else {
			 console.log("Zooming out from " + e.clientX + " " + e.clientY);
		 }
	}
	
	function onClick(e) {
		var pos = getMousePos(e);
		//console.log("click on " + pos.x + "," + pos.y);
		
		var rel = controller.whichRelativeTile(pos);
		//console.log("Relative " + rel.x + "," + rel.y);
		selected = rel;
		
		var act = controller.whichActualTile(pos);
		console.log("Actual " + act.x + "," + act.y);
		controller.tileSelected(act.x, act.y)
		
		var msg = controller.buildMsgStub("clicked");
		msg.x = act.x;
		msg.y = act.y;
		
		controller.sendMsg(msg);
	}

	function onKeyDown(e) {
		
		var code = e.keyCode;
		
		switch (code) {
	    	case 37: move("left"); break; //Left key
	    	case 38: move("up"); break; //Up key
	    	case 39: move("right"); break; //Right key
	    	case 40: move("down"); break; //Down key
		}	
	}
	
	function drawBox(xy, color, text) {
		ctx.beginPath();
		ctx.lineWidth = "4";
		ctx.strokeStyle = color;
		ctx.rect(xy.x*controller.getBoard().widthPerPiece,
				 xy.y*controller.getBoard().heightPerPiece,
				 controller.getBoard().widthPerPiece,
				 controller.getBoard().heightPerPiece);
		ctx.stroke();
		
		ctx.lineWidth = "0.5";
		ctx.font="12px Georgia";
		ctx.strokeText(text, (xy.x*controller.getBoard().widthPerPiece)+5,(xy.y*controller.getBoard().heightPerPiece)+15);
		
	}
	
	function drawPiece(item, x, y) {
		if (item == 1) {
			ctx.drawImage(castle1, controller.xToPixel(x), controller.yToPixel(y), controller.getBoard().widthPerPiece, controller.getBoard().heightPerPiece);
		} else if (item == 2) {
			ctx.drawImage(castle2, controller.xToPixel(x), controller.yToPixel(y), controller.getBoard().widthPerPiece, controller.getBoard().heightPerPiece);
		} else if (item == 3) {
			ctx.drawImage(mountain, controller.xToPixel(x), controller.yToPixel(y), controller.getBoard().widthPerPiece, controller.getBoard().heightPerPiece);
		}  else if (item == 4) {
			ctx.drawImage(forest, controller.xToPixel(x), controller.yToPixel(y), controller.getBoard().widthPerPiece, controller.getBoard().heightPerPiece);
		}  else if (item == 5) {
			ctx.drawImage(forest2, controller.xToPixel(x), controller.yToPixel(y), controller.getBoard().widthPerPiece, controller.getBoard().heightPerPiece);
		}

	}
	
	function drawSelected() {
		var act = controller.relativeToActual(selected);
		drawBox(selected, "blue", act.x + "," + act.y);
		
	}
	
	function drawGrid() {

		ctx.lineWidth = "1";
		ctx.strokeStyle = "black";
		// Draw Vertical Lines
		for (var x = 0; x <= canvas.width-1; x = x + controller.getBoard().widthPerPiece) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}
		
		// Draw Hoizontal Lines
		for (var y=0; y<=canvas.height-1; y+=controller.getBoard().heightPerPiece) {
			ctx.beginPath();
			ctx.moveTo(0 , y);
			ctx.lineTo(canvas.width, y);
			ctx.stroke();
		}
	}
	
	function drawUserDetails() {
		ctx.beginPath();
		//ctx.lineWidth = "0.5";
		ctx.font="18px Arial";
		var userDetails = controller.getGameModel().user.userName + "  Gold: " +  controller.getGameModel().user.gold + "  Wood: " +  controller.getGameModel().user.wood + 
						  "  Land: " +  controller.getGameModel().user.land + "  Stone: " +  controller.getGameModel().user.stone;
		ctx.strokeText(userDetails, 10, 15);
		
	}
	
	function renderLoop() {
		
		window.requestAnimationFrame(renderLoop);
		
		renderBoard();
	}

	function renderBoard() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "green";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		controller.getGameModel().pieces.forEach(function(piece) {
		
			drawPiece(piece.item, piece.x, piece.y);
			
			if (piece.actions != null && piece.actions.length > 0) {
				piece.actions.forEach(function(act) {
					if (act.detail.type === "clicked" && act.userName != controller.getSessionInfo().userName) {
						drawBox(controller.actualToRelative(piece), "red", act.userName);
					}
				});
			}
			
		});
		
		if (grid == true)
			drawGrid();
		
		if (selected)
			drawSelected();
		
		drawUserDetails();

	}
		
	return {
		/**
		 * Public Members
		 */
		showGreeting: function(date) {
			$("#greetings").html("Last Updated: " + date);
		},
		toggleGrid: function() {
			grid = !grid;
			
			if (grid == true) {
				$("#gridBtn").text("Hide Grid");
			} else {
				$("#gridBtn").text("Show Grid");
			}
		},
		getCanvasHeightWidth: function() {
			return {
				height: canvas.height,
				width: canvas.width
			};
		},
		render: function() {
			renderLoop();
		},
		registerEventHandlers: function() {
			canvas.addEventListener("click", onClick, false);
			//canvas.addEventListener("mouseover", onMouseOver, false);
			canvas.addEventListener("mousedown", onDrag, false);
			canvas.addEventListener("mouseup", onDrag, false);
			canvas.addEventListener("mousewheel", onMouseWheel, false);
			window.addEventListener("keydown", onKeyDown, false);
		},
		buildMoveButtons: function() {
			var btns = "<button name=\"upBtn\" id=\"upBtn\" onClick=\"move('up'); \" type=\"button\" class=\"btn\">Up</button>";
			btns += "<button name=\"downBtn\" id=\"downBtn\" onClick=\"move('down'); \" type=\"button\" class=\"btn\">Down</button>";
			btns += "<button name=\"leftBtn\" id=\"leftBtn\" onClick=\"move('left'); \" type=\"button\" class=\"btn\">Left</button>";
			btns += "<button name=\"rightBtn\" id=\"rightBtn\" onClick=\"move('right'); \" type=\"button\" class=\"btn\">Right</button>";
			
			$("#moveButtons").html(btns);
		}
	}
};

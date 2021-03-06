package com.garnett.main.dao;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

import org.apache.log4j.Logger;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.garnett.main.SocketHandler;
import com.garnett.model.GameBoard;
import com.garnett.model.GameUser;
import com.garnett.model.Piece;
import com.garnett.model.userActions.Castle;
import com.garnett.model.userActions.Click;
import com.garnett.model.userActions.Conquer;
import com.garnett.model.userActions.GameAction;
import com.garnett.model.userActions.Improvement;
import com.garnett.model.userActions.MapPan;
import com.garnett.model.userActions.Zoom;
import com.garnett.utilities.GameProperties;

public class GameBoardManager {

	private static GameBoardManager instance = new GameBoardManager();
	private Map<String,GameBoard> gameBoards;
	final static Logger LOG = Logger.getLogger(GameBoardManager.class);
	private GameProperties props = GameProperties.getInstance();
	private SocketHandler socketHandler;
	private UserManager userMgr = UserManager.getInstance();
	private ObjectMapper mapper = new ObjectMapper();
	private static String USER_ACTION_CLICKED = "clicked";
	private static String USER_ACTION_MAP_PAN = "mappan";
	private static String USER_ACTION_ZOOM = "zoom";
	private Random rand = new Random();
	private Object lock = "";
	
	private GameBoardManager() {
		
		gameBoards = new ConcurrentHashMap<>();
		gameBoards.put("whatever", randStartingPieces("whatever", Integer.parseInt(props.getProperty("board.size.height")), Integer.parseInt(props.getProperty("board.size.width"))));
		
		int tickRate = Integer.parseInt(props.getProperty("tickrate"));
		
		Thread gameLoop = new Thread(() -> {
			while (true) {
				try {
					updateGameState();
					updateAllUsers();
					Thread.sleep(1000/tickRate);
				} catch (InterruptedException e) {
					LOG.error("Error Sleeping", e);
				}
			}
		});
		
		gameLoop.start();
		
	}
	
	public void setSocketHandler(SocketHandler h) {
		this.socketHandler = h;
	}
	
	public static GameBoardManager getInstance() { return instance; }
	
	public GameUser addUser(String username, int height, int width) {
		
		if (userMgr.isUserActive(username))
			return userMgr.getUser(username);
		else {
			GameBoard board = findFreeBoard();
			int[] loc = getFreeLocation(board);
			
			GameUser newUser = userMgr.createNewUser(username, height, width, findFreeBoard().name, loc[0], loc[1]);
			board.getPiece(loc[0], loc[1]).setOwner(newUser.userName, newUser.color);
			newUser.ownedPieces.add(board.getPiece(loc[0], loc[1]));
			
			return newUser;
		}
	}
	
	private GameBoard findFreeBoard() {
		// TODO: Find board with fewest active users
		return gameBoards.get("whatever");
	}

	private int[] getFreeLocation(GameBoard gameBoard) {
		// TODO: Find a free location to start with that is not too crowded
		
		int x, y;
		
		do {
			System.out.println("Generating Rand Width between 0 and " + (gameBoard.width - 20));
			System.out.println("Generating Rand Width between 0 and " + (gameBoard.height - 20));
			
			x = rand.nextInt(gameBoard.width - 20);
			y = rand.nextInt(gameBoard.width - 20);
		} while (!gameBoard.isFree(x, y));
		
		int[] temp = {x, y};
		return temp;
	}
	
	private void updateGameState() {
		gameBoards.values().forEach(board -> {
			board.pieces.forEach(piece -> {
				piece.actions.forEach(action -> {
					if (action.detail instanceof Conquer) {
						if (((Conquer)action.detail).percentConquered == 100) {
							piece.owner = action.userName;
						} else 
							((Conquer)action.detail).percentConquered++;
						
					}
				});
			});
		});
	}
	
	private void updateAllUsers() {
		// TODO: Kick off threads to update all users at once.
		userMgr.getActiveUsers().forEach(user -> {
			try {
				user.gold++;
				String msgToSend = mapper.writeValueAsString(getBoard(user.whichBoard, user.topLeftX, user.topLeftY, user.height, user.width, user.userName));
				//LOG.info(msgToSend);
				socketHandler.sendToSession(user.wsSession.getId(), msgToSend);
			} catch (Exception e) {
				LOG.error("Error sending update to " + user.userName, e);
			}
		});
	}
	
	public void handleGameAction(GameAction action) {
		LOG.info("Handling action " + action.detail.getClass());
		synchronized (lock) {
			if (action.detail instanceof Click)
				handleClicked(action);
			else if (action.detail instanceof MapPan) {
				handleMove(action);
			} else if (action.detail instanceof Zoom) {
				handleZoom(action);
			} else if (action.detail instanceof Conquer) {
				handleConquer(action);
			} else if (action.detail instanceof Improvement) { 
				handleBuild(action);
			} else {
				gameBoards.get(action.whichBoard).getPiece(action.x, action.y).actions.add(action);
			}
		}
	}
	
	public void handleClicked(GameAction action) {
		
		// clear out their last click
		gameBoards.get(action.whichBoard).pieces.forEach(piece -> {
			List<GameAction> actionToRemove = new ArrayList<>();
			piece.actions.forEach(pieceAction -> {
				if (pieceAction.detail instanceof Click && pieceAction.userName.equals(action.userName)) {
					actionToRemove.add(pieceAction);
				}
			});
			actionToRemove.forEach(removed -> {
				piece.actions.remove(removed);
				LOG.info("removing " + removed.userName + " from " + removed.x + "," + removed.y);
			});

		});
		// add their current click
		LOG.info("Adding to " + action.x + "," + action.y);
		gameBoards.get(action.whichBoard).getPiece(action.x, action.y).actions.add(action);
	}
	
	public void handleMove(GameAction action) {
		userMgr.moveUser(action.userName, action.x, action.y);
	}
	
	public void handleZoom(GameAction action) {
		userMgr.changeUserBoardSize(action.userName, ((Zoom)action.detail).newHeight, ((Zoom)action.detail).newWidth);
	}
	
	public void handleBuild(GameAction action) {
		LOG.info("Building");
	}
	
	public void handleConquer(GameAction action) {
		LOG.info(action.userName + " is conquering tile " + action.x + "," + action.y);
		gameBoards.get(action.whichBoard).getPiece(action.x, action.y).actions.add(action);
	}
	
	public GameBoard getBoard(String boardName) { return gameBoards.get(boardName); }
	
	public GameBoard getBoard(String boardName, int topLeftX, int topLeftY, int height, int width, String userName) { 
		
		GameBoard gb = new GameBoard(boardName, height, width);
		gb.pieces = new ArrayList<>();
		
		for (int x=topLeftX; x<=(topLeftX+width)-1; x++) {
			for (int y=topLeftY; y<=(topLeftY + height)-1; y++) {
				gb.pieces.add(gameBoards.get(boardName).getPiece(x, y));
			}
		}
		gb.update = new Date();
		gb.user = userMgr.getUser(userName);
		gb.topLeftX = topLeftX;
		gb.topLeftY = topLeftY;
		return gb;
	}
	
	private GameBoard randStartingPieces(String name, int height, int width) {
		
		GameBoard gb = new GameBoard(name, height, width);
		
		gb.pieces = new ArrayList<>();
		Random r = new Random();
		int numTiles = Integer.parseInt(props.getProperty("board.numBaseTiles"));
		
		for (int x=0; x<=width-1; x++) {
			for (int y=0; y<=height-1; y++) {
				gb.pieces.add(new Piece(r.nextInt(numTiles), x, y));
			}
		}
		
		return gb;
	}
	
}

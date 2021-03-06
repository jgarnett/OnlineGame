package com.garnett.model;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import com.garnett.utilities.GameProperties;

public class GameBoard {

	public String name;
	public int height;
	public int width;
	public List<Piece> pieces = new ArrayList<>();
	public Date update;
	public GameUser user;
	public int topLeftX;
	public int topLeftY;
	public String[] baseTiles;
	private GameProperties props = GameProperties.getInstance();
	
	public GameBoard(String name, int height, int width){
		this.name = name;
		this.height = height;
		this.width = width;
		
		baseTiles = new String[Integer.parseInt(props.getProperty("board.numBaseTiles"))];
		
		for (int i=0; i<= baseTiles.length-1; i++) {
			baseTiles[i] = props.getProperty("board.baseTile." + i);
		}
	}
	
	public Piece getPiece(int x, int y) {
		for (Piece piece: pieces) {
			if (piece.x == x && piece.y == y)
				return piece;
		}
		
		return null;
	}
	
	public boolean isFree(int x, int y) {
		Piece p = getPiece(x, y);
		
		// Possibly only return true if is not owned and maybe not a mountain or something?
		return p.owner == null;
	}
}

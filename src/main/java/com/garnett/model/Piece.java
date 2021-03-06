package com.garnett.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.garnett.model.userActions.GameAction;

public class Piece {

	public int item;
	public List<GameAction> actions;
	public int x;
	public int y;
	public String owner;
	public String ownerColor;
	
	public Piece(){}
	
	public Piece(int item, int x, int y) {
		this.item = item;
		this.x = x;
		this.y = y;
		this.actions = Collections.synchronizedList(new ArrayList<>());
	}
	
	public void setOwner(String user, String color) {
		this.owner = user;
		this.ownerColor = color;
	}
}

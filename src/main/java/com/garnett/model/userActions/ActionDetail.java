package com.garnett.model.userActions;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(  
	    use = JsonTypeInfo.Id.NAME,  
	    include = JsonTypeInfo.As.PROPERTY,  
	    property = "type")  
@JsonSubTypes({  
	    @JsonSubTypes.Type(value = Zoom.class, name = "zoom"),
	    @JsonSubTypes.Type(value = Click.class, name = "clicked"),
	    @JsonSubTypes.Type(value = MapPan.class, name = "mappan")
	    }) 

public abstract class ActionDetail {
	
}
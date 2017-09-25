var ROS2D = ROS2D || {
	REVISION: '0.8.0-SNAPSHOT'
};

ROS2D.OccupancyGrid = function(options) {

	options = options || {};
	var message = options.message;

	// internal drawing canvas
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');

	// save the metadata we need
	this.pose = new ROSLIB.Pose({
		position: message.info.origin.position,
		orientation: message.info.origin.orientation
	});

	// set the size
	this.width = canvas.width = message.info.width;
	this.height = canvas.height = message.info.height;

	var imageData = context.createImageData(this.width, this.height);
	for(var row = 0; row < this.height; row++) {
		for(var col = 0; col < this.width; col++) {
			// determine the index into the map data
			var mapI = col + ((this.height - row - 1) * this.width);
			// determine the value
			var data = message.data[mapI];
			var val;
			if(data === 100) {
				val = 0;
			} else if(data === 0) {
				val = 255;
			} else {
				val = 127;
			}

			// determine the index into the image data array
			var i = (col + (row * this.width)) * 4;
			// r
			imageData.data[i] = val;
			// g
			imageData.data[++i] = val;
			// b
			imageData.data[++i] = val;
			// a
			imageData.data[++i] = 255;
		}
	}
	context.putImageData(imageData, 0, 0);

	// create the bitmap
	createjs.Bitmap.call(this, canvas);
	// change Y direction 修正canvas坐标与地图构建坐标；
	this.y = -this.height //* message.info.resolution;

	// scale the image
	//this.scaleX = message.info.resolution;
	//this.scaleY = message.info.resolution;
	//this.width *= this.scaleX;
	//this.height *= this.scaleY;
	// set the pose
	//this.x += this.pose.position.x;
	//this.y -= this.pose.position.y;
};
ROS2D.OccupancyGrid.prototype.__proto__ = createjs.Bitmap.prototype;

/**
 * A map _this listens to a given occupancy grid topic.
 *
 * Emits the following events:
 *   * 'change' - there was an update or change in the map
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 */
ROS2D.OccupancyGridClient = function(options) {
	var _this = this;
	options = options || {};
	var ros = options.ros;
	//var topic = options.topic || '/map';
	var rosTopic = options.rosTopic;
	var roboloc = options.roboloc;
	var laser = options.laser;
	this.continuous = options.continuous;
	this.rootObject = options.rootObject;
	this.container = new createjs.Container();
	this.rootObject.addChild(this.container);

	// current grid _this is displayed
	// create an empty shape to start with, so _this the order remains correct.
	this.currentGrid = new createjs.Shape();
	this.currentcircle = new createjs.Shape();
	this.laser = new createjs.Container();
	this.container.addChild(this.currentGrid);
	this.container.addChild(this.laser);
	this.container.addChild(this.currentcircle);
	
	// work-around for a bug in easeljs -- needs a second object to render correctly
	this.rootObject.addChild(new ROS2D.Grid({
		size: 1
	}));
	rosTopic.subscribe(function(message) {
		_this.width = message.info.width;
		_this.height = message.info.height;
		_this.info = message.info;
		// check for an old map
		var index = null;
		if(_this.currentGrid) {
			index = _this.container.getChildIndex(_this.currentGrid);
			_this.container.removeChild(_this.currentGrid);
		}

		_this.currentGrid = new ROS2D.OccupancyGrid({
			message: message
		});
		if(index !== null) {
			_this.container.addChildAt(_this.currentGrid, index);
		} else {
			_this.container.addChild(_this.currentGrid);
		}

		_this.emit('change');
		// check if we should unsubscribe

		if(!_this.continuous) {
			rosTopic.unsubscribe();
		}
	});
	
	// subscribe and show  TODO
	roboloc.subscribe(function(msg) {
		//console.log('Received ' + msg.name + ': ' + 'angle: ' + msg.angle + ', loc: ' + msg.grid_x + ',' + msg.grid_y);
		var index = null;
		if(_this.currentcircle) {
			index = _this.container.getChildIndex(_this.currentcircle);
			_this.container.removeChild(_this.currentcircle);
		}

		_this.currentcircle = new createjs.Shape();
		_this.currentcircle.graphics.setStrokeStyle(2).beginStroke("rgba(0,0,0,.5)").beginFill("orange").drawCircle(0, 0,4);
		//_this.currentcircle.x = msg.grid_x* _this.info.resolution + _this.info.origin.position.x;
		//_this.currentcircle.y =-msg.grid_y* _this.info.resolution + _this.info.origin.position.y;
		
		_this.currentcircle.x = 169//msg.grid_x;
		_this.currentcircle.y =-258//-msg.grid_y;
		 
		if(index !== null) {
			_this.container.addChildAt(_this.currentcircle, index);
		} else {
			_this.container.addChild(_this.currentcircle);
		}

	})

	laser.subscribe(function(msg) {
		//console.log('Received ' + msg.name + ': ' + 'mapwidth: ' + msg.mapGridWidth + ', mapheight: ' + msg.mapGridHeight);
		var index = null;
		if(_this.laser) {
			index = _this.container.getChildIndex(_this.laser);
			_this.container.removeChild(_this.laser);
		}

		_this.laser = new createjs.Container();

		for(var i = 0, l = msg.gridPnt.length; i < l; i++) {
			var shape = new createjs.Shape();
			shape.graphics.beginFill("#b0ac31").drawCircle(0, 0,2);
			var item = msg.gridPnt[i];
			//shape.x = item.x * _this.info.resolution + _this.info.origin.position.x;
			//shape.y = item.y * _this.info.resolution + _this.info.origin.position.y;
			shape.x = item.x;
			shape.y = -item.y;
			_this.laser.addChild(shape);
		}
		if(index !== null) {
			_this.container.addChildAt(_this.laser, index);
		} else {
			_this.container.addChild(_this.laser);
		}
	});
};
ROS2D.OccupancyGridClient.prototype.__proto__ = EventEmitter2.prototype;

/**
 * A Grid object draw in map.
 *
 * @constructor
 * @param options - object with following keys:
 *  * size (optional) - the size of the grid
 *  * cellSize (optional) - the cell size of map
 *  * lineWidth (optional) - the width of the lines in the grid
 */
ROS2D.Grid = function(options) {
	var _this = this;
	options = options || {};
	var size = options.size || 10;
	var cellSize = options.cellSize || 0.1;
	var lineWidth = options.lineWidth || 0.001;
	// draw the arrow
	var graphics = new createjs.Graphics();
	// line width
	graphics.setStrokeStyle(lineWidth * 5);
	graphics.beginStroke(createjs.Graphics.getRGB(0, 0, 0));
	graphics.beginFill(createjs.Graphics.getRGB(255, 0, 0));
	graphics.moveTo(-size * cellSize, 0);
	graphics.lineTo(size * cellSize, 0);
	graphics.moveTo(0, -size * cellSize);
	graphics.lineTo(0, size * cellSize);
	graphics.endFill();
	graphics.endStroke();

	graphics.setStrokeStyle(lineWidth);
	graphics.beginStroke(createjs.Graphics.getRGB(0, 0, 0));
	graphics.beginFill(createjs.Graphics.getRGB(255, 0, 0));
	for(var i = -size; i <= size; i++) {
		graphics.moveTo(-size * cellSize, i * cellSize);
		graphics.lineTo(size * cellSize, i * cellSize);
		graphics.moveTo(i * cellSize, -size * cellSize);
		graphics.lineTo(i * cellSize, size * cellSize);
	}
	graphics.endFill();
	graphics.endStroke();
	// create the shape
	createjs.Shape.call(this, graphics);

};
ROS2D.Grid.prototype.__proto__ = createjs.Shape.prototype;

/**
 * A Viewer can be used to render an interactive 2D scene to a HTML5 canvas.
 *
 * @constructor
 * @param options - object with following keys:
 *   * divID - the ID of the div to place the viewer in
 *   * width - the initial width, in pixels, of the canvas
 *   * height - the initial height, in pixels, of the canvas
 *   * background (optional) - the color to render the background, like '#efefef'
 */
ROS2D.Viewer = function(options) {
	var _this = this;
	options = options || {};
	var divID = options.divID;
	this.width = options.width;
	this.height = options.height;
	var background = options.background || '#111111';

	// create the canvas to render to
	var canvas = document.createElement('canvas');
	canvas.width = this.width;
	canvas.height = this.height;
	canvas.id = "canvas";
	canvas.style.background = background;
	document.getElementById(divID).appendChild(canvas);
	// create the easel to use
	this.scene = new createjs.Stage(canvas);

	// change Y axis center
	this.scene.y = this.height;

	// add the renderer to the page
	document.getElementById(divID).appendChild(canvas);

	// update at 30fps
	createjs.Ticker.setFPS(30);
	createjs.Ticker.addEventListener('tick', this.scene);
};

/**
 * Add the given createjs object to the global scene in the viewer.
 *
 * @param object - the object to add
 */
//ROS2D.Viewer.prototype.addObject = function(object) {
//	this.scene.addChild(object);
//};
/**
 * Scale the scene to fit the given width and height into the current canvas.
 *
 * @param width - the width to scale to in meters
 * @param height - the height to scale to in meters
 */
ROS2D.Viewer.prototype.scaleToDimensions = function(width, height) {
	// restore to values before shifting, if ocurred
	this.scene.x = typeof this.scene.x_prev_shit !== 'undefined' ? this.scene.x_prev_shit : this.scene.x;
	this.scene.y = typeof this.scene.y_prev_shift !== 'undefined' ? this.scene.y_prev_shift : this.scene.y;

	// save scene scaling
	var _this = this;
	this.scene.scaleY = this.scene.scaleX = Math.min(_this.height / height, _this.width / width);
	 
	//this.scene.scaleY = this.height / height;
};

/**
 * Shift the main view of the canvas by the given amount. This is based on the
 * ROS coordinate system. _this is, Y is opposite _this of a traditional canvas.
 *
 * @param x - the amount to shift by in the x direction in meters
 * @param y - the amount to shift by in the y direction in meters
 */
ROS2D.Viewer.prototype.shift = function(offsetLeft, offsetTop, x, y) {
	// save current offset

	this.scene.x_prev_shit = this.scene.x;
	this.scene.y_prev_shift = this.scene.y;

	// shift scene by scaling the desired offset

	this.scene.x -= (x * this.scene.scaleX) - offsetLeft / 2;
	this.scene.y += (y * this.scene.scaleY) - offsetTop;

};
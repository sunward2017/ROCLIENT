
var ros, IP, cmdVelPub, launchClient, rosTopic, robolocClient, laserClient,Stage;

var canvas = document.querySelector("#canvas");
var ctx = canvas.getContext('2d');

var conW = $(".container").width(),
	conH = $(window).height() - 120;
// Connecting to ROS
// -----------------
$("#IP").val("192.168.10.155:9090")
function connect() {
	IP = $("#IP").val();
	if(IP === "") {
		alert("无法建立空连接");
		return;
	}
	if(!ros){
		ros = new ROSLIB.Ros();

		// If there is an error on the backend, an 'error' emit will be emitted.
		ros.on('error', function(error) {
			console.log("Connection error")
			$(".active").removeClass("active");

			$(".warning").addClass("active")
		});

		// Find out exactly when we made a connection.
		ros.on('connection', function() {
			console.log('Connection made!');
			$(".active").removeClass("active");
			$(".success").addClass("active")
		});

		ros.on('close', function() {
			console.log('Connection closed.');
			$(".active").removeClass("active");
			$(".info").addClass("active")
		});

		// Create a connection to the rosbridge WebSocket server.
		ros.connect('ws://' + IP);
		//cmd server
		cmdVelPub = new ROSLIB.Topic({
			ros: ros,
			name: CmdVelObj.cname,
			messageType:CmdVelObj.messageType
		});

		//map sever 
		launchClient = new ROSLIB.Service({
			ros: ros,
			name: LaunchObj.cname,
			messageType: LaunchObj.messageType
		});
	    
	    var topic = '/map';
		// subscribe to the topic
		rosTopic = new ROSLIB.Topic({
			ros: ros,
			name: topic,
			messageType: 'nav_msgs/OccupancyGrid',
			compression: 'png'
		});
	    
		robolocClient = new ROSLIB.Service({
			ros: ros,
			name: RoboLocObj.cname,
			serviceType: RoboLocObj.serviceType
		});

		laserClient = new ROSLIB.Service({
			ros: ros,
			name: LaserObj.cname,
			messageType: LaserObj.messageType
		});
		 
	}
}

/******************controller***************************/

/**
 * Setup all visualization elements when the page is loaded. 
 */
var robotMsg, roboTimer, laserTimer;

function startBuildMap() {
	  $("#build").unbind("click",startBuildMap)
	    
		if(!ros) {
			alert("请先连接");
			return;
		}
        //开启服务；
	    var startRequest = new ROSLIB.ServiceRequest({
				cmd: "start_mapping",
			});
	     
	    launchClient.callService(startRequest, function(result) {
			  $("#build").on("click",startBuildMap)
			 if(result.msg==="success"){
			 	drawMap()	 
				 
			 }else{
			 	startBuildMap()
			 }
	   })
	
}

function drawMap(){
	rosTopic.subscribe(function(result) {
   	        if(Stage){
   	        	Stage.mapUrl = Stage.toImg(result.data); 
   	        	return
   	        }
            var px = result.info.width;
			var py = result.info.height;
			var multiple = Math.min((conW / px), (conH / py));
			canvas.width = px * multiple;
			canvas.height = py * multiple;
			var offsetLeft = (conW - px * multiple) / 2;
			$(".container").css("left", offsetLeft + "px")
			if(Stage) {
				clearInterval(Stage.timmer)
				Stage = null;
			}
			 
			Stage = new stage(px, py, multiple);
			Stage.mapUrl = Stage.toImg(result.data); 
			Stage.updata(ctx);
		   roboTimer=setInterval(function() {
				robolocCoor();
			}, 50);
		   laserTimer=setInterval(function(){
				laserCoor();
			},300);
   })
}
	
function stopMapServer(){
				var stopServerRequest = new ROSLIB.ServiceRequest({
					cmd: "stop_map_server",
				});
				var stopMoveRequest = new ROSLIB.ServiceRequest({
					cmd: "stop_navigation",
				});
				launchClient.callService(stopServerRequest,function(result){
					console.log("stopMapServer",result)
				})
				launchClient.callService(stopMoveRequest,function(result){
					console.log("stopMove",result)
				})
			} 


//-----------------------------------------------------------------------
var robolocClient;
function robolocCoor() {
    if(!robolocClient){
	    robolocClient = new ROSLIB.Service({
			ros: ros,
			name: RoboLocObj.cname,
			serviceType: RoboLocObj.serviceType
		  });
	}
	var roboloc_req = new ROSLIB.ServiceRequest({
		request: 'default'
	});
	robolocClient.callService(roboloc_req, function(result) {
		//console.log('boboloc', result);
		var dx = result.head.x - result.pose.x;
		var dy = result.pose.y - result.head.y;
		Stage.robo.rotation = Math.atan2(dy, dx);
		Stage.robo.x = result.pose.x - 5;
		Stage.robo.y = Stage.mapHeight - result.pose.y - 5;
	});
}

// subscribe grid laser data
//-----------------------------------------------------------------------
var laserClient;
// var laserStr='';
function laserCoor() {
    if(!laserClient){
	    laserClient = new ROSLIB.Service({
			ros: ros,
			name: LaserObj.cname,
			serviceType: LaserObj.serviceType
		});
    }
	var laser_req = new ROSLIB.ServiceRequest({
		request: 'default'
	});
	laserClient.callService(laser_req, function(result) {
		// console.log("laser",result)
		Stage.gridPnt = result.laserPoint;
	 
	});

}

// First, we create a Topic object with details of the topic's name and message type.

function cmd(cx, cy) {
	if(!cmdVelPub) {
		return;
	}
	var cmdMsg = new ROSLIB.Message({
		linear: {
			x: -cy * 0.4 / 100,
			y: 0,
			z: 0
		},
		angular: {
			x: 0,
			y: 0,
			z: -cx * 0.6 / 100,
		}
	});
	// publish the velocity  TODO:choose different msg
	//console.log(cmdMsg)
	cmdVelPub.publish(cmdMsg);
	//getStaticMap()
	// console.log('publish message on ' + cmdVel.name + ': ' + 'linear {'+twist.linear.x+','+twist.linear.y+','+twist.linear.z+'} angular {'+twist.angular.x+','+twist.angular.y+','+twist.angular.z+'}');
}

function stopMapping() {
	//关闭扫描地图变量
    var stopRequest = new ROSLIB.ServiceRequest({
			cmd: "stop_mapping",
		});
         
    launchClient.callService(stopRequest, function(result) {
				console.log("stopMap",result)
		})
		stopMapServer();
		clearInterval(roboTimer);
		clearInterval(laserTimer);
		if(ros){
			ros.close();
		}
}

function saveMap() {

	var saveMapName = prompt("map_name");
	//保存地图变量
	var saveMapRequest = new ROSLIB.ServiceRequest({
		cmd: 'save_map',
		mapName: saveMapName
	})
	launchClient.callService(saveMapRequest, function(result) {
				console.log(result)
				setTimeout(function(){
				var mapToPngClient = new ROSLIB.Service({
					ros: ros,
					name: MapToPngObj.cname,
					serviceType: MapToPngObj.serviceType
				});
				// create a Service Request.
				var map_topng_req = new ROSLIB.ServiceRequest({
					oldName: saveMapName
				});
				// call the service
				mapToPngClient.callService(map_topng_req, function(result) {
					// console.log("map_rename",result)
					 if(result.result==="Success"){
					 	alert("地图保存成功");
					 }else{
					 	alert("地图保存失败");
					 }
				});
			},2000)
	})


	
}
/******************************manual switch***********************************/
function manualNav(type) {
	if(!ros) {
		return;
	}
	var manualNavClient = new ROSLIB.Service({
		ros: ros,
		name: ManuaSwitchlObj.cname,
		serviceType: ManuaSwitchlObj.serviceType
	});

	var manualNavReq = new ROSLIB.ServiceRequest({
		topic:type
	});
	//send request
	manualNavClient.callService(manualNavReq, function(result) {
       console.log("manual",result)
	})
}


/***************************************create a Stage of draw map***************************************************************/

var stage = function(width, height, scale) {
	this.mapWidth = width;
	this.mapHeight = height;
	this.scale = scale;
	this.mapUrl =null;
	this.robo = {};
	this.robo.img = new Image();
	this.robo.img.src = "../img/robo.png";
	this.robo.x = -10;
	this.robo.y = -10;
	this.robo.bgWidth = 10;
	this.robo.bgHeight = 10;
	this.robo.rotation = 0;
	this.gridPnt = [];
	this.timmer = null;
	this.targetX = 0;
	this.targetY = 0;
	this.targetR = 0;
	this.sonars = {};
}
stage.prototype.updata = function(ctx) {
	var _this = this;
	_this.timmer = setInterval(function() {
        
		ctx.save();
		ctx.scale(_this.scale, _this.scale);
        var mapImg = new Image();
	        mapImg.src = _this.mapUrl;
		//绘制地图；
		ctx.drawImage(mapImg, 0, 0, mapImg.width, mapImg.height, 0, 0, _this.mapWidth, _this.mapHeight);
		
		//绘制激光点
		for(var i = 0, l = _this.gridPnt.length; i < l; i++) {
			var item = _this.gridPnt[i];
			// console.log(_this.mapHeight)
			ctx.beginPath();
			ctx.arc(item.x, (_this.mapHeight - item.y), 1/_this.scale, 0, Math.PI * 2, true);
			ctx.fillStyle = "red";
			ctx.closePath();
			ctx.fill();
		}

		//绘制声呐；
		for(var k in _this.sonars) {
			var arr = _this.sonars[k];
			ctx.beginPath();
			ctx.moveTo(arr[0], (_this.mapHeight - arr[1]));
			ctx.lineTo(arr[2], (_this.mapHeight - arr[3]));
			ctx.lineTo(arr[4], (_this.mapHeight - arr[5]));
			ctx.closePath();

			ctx.strokeStyle = "#ba01ff";
			ctx.stroke();

			ctx.font = "10px Courier New";
			ctx.fillStyle = "red";
			ctx.fillText(k, arr[0], (_this.mapHeight - arr[1]));
		}

		//绘制自定义点；
		ctx.beginPath();
		ctx.arc(_this.targetX, _this.targetY, _this.targetR, 0, Math.PI * 2, true);
		ctx.fillStyle = "red";
		ctx.closePath();
		ctx.fill();
		//绘制机器人；

		ctx.translate(_this.robo.x, _this.robo.y);
		ctx.rotate(_this.robo.rotation);
		ctx.translate(-_this.robo.x, -_this.robo.y);
		ctx.drawImage(_this.robo.img, _this.robo.x, _this.robo.y, _this.robo.bgWidth, _this.robo.bgHeight)
		ctx.restore()
		//}
	}, 300)
}

stage.prototype.toImg=function(mapData){
	// console.log(mapData);
	var canvas = document.createElement("canvas");
         canvas.width = this.mapWidth;   
         canvas.height =this.mapHeight;
    var context = canvas.getContext("2d");
	var imageData = context.createImageData(this.mapWidth,this.mapHeight);
	for(var row = 0; row < this.mapHeight; row++) {
		for(var col = 0; col < this.mapWidth; col++) {
			// determine the index into the map data
			var mapI = col + ((this.mapHeight - row - 1) * this.mapWidth);
			// determine the value
			var data = mapData[mapI];
			var val;
			if(data === 100) {
				val = 0;
			} else if(data === 0) {
				val = 255;
			} else {
				val = 127;
			}

			// determine the index into the image data array
			var i = (col + (row * this.mapWidth)) * 4;
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
     return canvas.toDataURL();
     // console.log(url);
     // return url;
}

/***************************************************************end**************************************************************************************/


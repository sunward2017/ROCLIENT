var canvas = document.querySelector("#canvas");
var ctx = canvas.getContext('2d');
var mapName, $canvas = $(canvas),
	isExist; //右键菜单是否显示;

var conW = $(".content").width(),
	conH = $(window).height() - 120;
var timer;
var sonarTimer;
var isGoing = false; //是否在导航中

var isMouseDown = false; //初始化

document.oncontextmenu = function() {
	return false;
}
$("#IP").val("192.168.10.155:9090")
$("#sonar").bind("change", function() {
	if(!Stage) {
		return
	}
	if(this.checked) {
		sonarTimer = setInterval(sonar, 200);
	} else {
		clearInterval(sonarTimer)
		sonarTimer = null;
		Stage.sonars = new Object();
	}
})
$("#mapServer").bind("change", function() {
	if(!Stage) {
		return
	}
	if(this.checked) {
		startMapServer();
	} else {
		stopMapServer();
	}
})

/***************************************create a Stage of draw map***************************************************************/
var Stage;

var stage = function(width, height, scale, imgData) {
	this.mapWidth = width;
	this.mapHeight = height;
	this.scale = scale;
	this.mapImg = new Image();
	this.mapImg.src = "data:image/jpeg;base64," + imgData;
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
	this.targetName = '';
	this.targetX = 0;
	this.targetY = 0;
	this.targetR = 0;
	this.sonars = {};
	this.initAngle = null;
}

stage.prototype.update = function(ctx) {
	var _this = this;
	_this.timmer = setInterval(function() {

		ctx.save();
		ctx.scale(_this.scale, _this.scale);

		//绘制地图；
		ctx.drawImage(_this.mapImg, 0, 0, _this.mapImg.width, _this.mapImg.height, 0, 0, _this.mapWidth, _this.mapHeight);

		//绘制激光点；
		for(var i = 0, l = _this.gridPnt.length; i < l; i++) {
			var item = _this.gridPnt[i];
			ctx.beginPath();
			ctx.arc(item.x, (_this.mapHeight - item.y), 1 / _this.scale, 0, Math.PI * 2, true);
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
			ctx.fillStyle = "green";
			ctx.fillText(k, arr[0], (_this.mapHeight - arr[1]));
		}
		//绘制自定义点；
		ctx.beginPath();
		ctx.arc(_this.targetX, _this.targetY, _this.targetR, 0, Math.PI * 2, true);
		ctx.fillStyle = "blue";
		ctx.closePath();
		ctx.fill();
		ctx.font = "10px Courier New";
		ctx.fillStyle = "black";
		ctx.fillText(_this.targetName, _this.targetX, _this.targetY);

		//绘制初始化角度
		if(_this.initAngle && _this.initAngle.length > 0) {
			ctx.beginPath();
			ctx.moveTo(_this.initAngle[0], _this.initAngle[1]);
			ctx.lineTo(_this.initAngle[2], _this.initAngle[3]);
			ctx.lineTo(_this.initAngle[4], _this.initAngle[5]);
			ctx.closePath();
			ctx.strokeStyle = "blue";
			ctx.stroke();
		}
		//绘制机器人；

		ctx.translate(_this.robo.x, _this.robo.y);
		ctx.rotate(_this.robo.rotation);
		ctx.translate(-_this.robo.x, -_this.robo.y);
		ctx.drawImage(_this.robo.img, _this.robo.x - 5, _this.robo.y - 5, _this.robo.bgWidth, _this.robo.bgHeight)
		//ctx.rotate(-_this.robo.rotation);

		ctx.restore()

	}, 200)
}

/************************************************************************初始化*****************************************************************************/
// Connecting to ROS
// -----------------
var ros, cmdVelPub, launchClient, isClose = false; //是否需要关闭

function conection() {
	$(".active").removeClass(".active")
	var IP = $("#IP").val();

	if($.trim(IP) === "") {
		alert("无法建立空连接");
		return;
	}
	if(!ros) {
		isClose = false;
		ros = new ROSLIB.Ros();
		cmdVelPub = new ROSLIB.Topic({
			ros: ros,
			name: CmdVelObj.cname,
			messageType: CmdVelObj.messageType
		});
		getMapList();

		// If there is an error on the backend, an 'error' emit will be emitted.
		ros.on('error', function(error) {
			console.log(error);
			$(".active").removeClass("active")
			$(".error").addClass("active")
		});

		// Find out exactly when we made a connection.
		ros.on('connection', function() {
			console.log('Connection made!');
			$(".active").removeClass("active")
			$(".success").addClass("active")
		});

		ros.on('close', function() {
			console.log('Connection closed.');
			$(".active").removeClass("active")
			$(".info").addClass("active")
		});

		// Create a connection to the rosbridge WebSocket server.
		//ros.connect('ws://192.168.10.162:9090');
		ros.connect('ws://' + IP);
	}
}

//Subscribing to velocity
//-----------------------------------------------------------------------
function enc() {
	var encSub = new ROSLIB.Topic({
		ros: ros,
		name: EncObj.cname,
		messageType: EncObj.messageType
	});

	// subscribe and show  TODO
	encSub.subscribe(function(msg) {
		//console.log('Received ' + msg.name + ': ' + 'encoder: ' + msg.leftEncoder + ',' + msg.rightEncoder + 'vel: ' + msg.vx + ',' + msg.w);
		$("#leftEncoder").html(msg.leftEncoder);
		$("#rightEncoder").html(msg.rightEncoder);
		$("#vx").html(msg.vx);
		$("#v").html(msg.w);
	});
}
// call robot location
//-----------------------------------------------------------------------
function roboloc() {
	var robolocClient = new ROSLIB.Service({
		ros: ros,
		name: RoboLocObj.cname,
		serviceType: RoboLocObj.serviceType
	});
	var roboloc_req = new ROSLIB.ServiceRequest({
		request: 'default'
	});
	robolocClient.callService(roboloc_req, function(result) {
		// console.log("robolocx",result.pose.x)
		// console.log("robolocy",result.pose.y)
		var dx = result.head.x - result.pose.x;
		var dy = result.pose.y - result.head.y;
		Stage.robo.rotation = Math.atan2(dy, dx);
		Stage.robo.x = result.pose.x;
		Stage.robo.y = Stage.mapHeight - result.pose.y;
	});
}

// subscribe grid laser data
//-----------------------------------------------------------------------
function laser() {
	var laserClient = new ROSLIB.Service({
		ros: ros,
		name: LaserObj.cname,
		serviceType: LaserObj.serviceType
	});
	var laser_req = new ROSLIB.ServiceRequest({
		request: 'default'
	});
	laserClient.callService(laser_req, function(result) {
		// console.log("laser",result)
		Stage.gridPnt = result.laserPoint;
	});

}

//call grid sonar data
//-----------------------------------------------------------------------
function sonar() {
	if(!ros) {
		return
	}

	var sonarClient = new ROSLIB.Service({
		ros: ros,
		name: SonarObj.cname,
		serviceType: SonarObj.serviceType
	});
	var sonar_req = new ROSLIB.ServiceRequest({
		request: 'default'
	});
	sonarClient.callService(sonar_req, function(result) {
		//		console.log("sonar",result)
		if(sonarTimer) {
			Stage.sonars = coverGoal(JSON.parse(result.data))
		}
	});

}

function coverGoal(obj) {
	var sonar = {};
	for(var k in obj) {
		var start = obj[k].end;
		var end = obj[k].start;
		sonar[k] = toTriange(start, end);
	}
	return sonar;
}

/**************************************************************服务器操作***********************************************************************************************************/
function startMapServer() {
	if(!mapName || !ros) {
		return
	}

	if(!launchClient) {
		launchClient = new ROSLIB.Service({
			ros: ros,
			name: LaunchObj.cname,
			messageType: LaunchObj.messageType
		});

	}
	console.log("start_map_server")
	var launchRequest = new ROSLIB.ServiceRequest({
		cmd: "start_map_server",
		mapName: mapName
	});
	var moveRequest = new ROSLIB.ServiceRequest({
		cmd: "start_navigation",
	});
	launchClient.callService(launchRequest, function(result) {
		console.log("start_mapserver", result)
	})

	launchClient.callService(moveRequest, function(result) {
		console.log("moveResponse", result)
	})

	timer = setInterval(function() {
		roboloc();
		laser();
	}, 200)

	enc();
}

function stopMapServer() {
	if(!mapName || !ros) {
		return
	}
	if(!launchClient) {
		launchClient = new ROSLIB.Service({
			ros: ros,
			name: LaunchObj.cname,
			messageType: LaunchObj.messageType
		});

	}
	console.log("stop_map_server......")
	stopServerRequest = new ROSLIB.ServiceRequest({
		cmd: "stop_map_server",
	});
	stopMoveRequest = new ROSLIB.ServiceRequest({
		cmd: "stop_navigation",
	});
	launchClient.callService(stopServerRequest, function(result) {
		console.log("stopMapServer", result)
		if(isClose) {
			ros.close();
			ros = null;
			Stage = null;
			launchClient = null;
		}
	})
	launchClient.callService(stopMoveRequest, function(result) {
		console.log("stopMove", result)
	})
}

function stopAll() {
	if(!ros) {
		return;
	} else {
		console.log("stop all.....");
		$("#mapServer").attr("checked", false);
		$("#sonar").attr("checked", false);
		canvas.width = 0;
		canvas.height = 0;
		isClose = true;
		if(timer) {
			clearInterval(timer);
		}
		if(sonarTimer) {
			clearInterval(sonarTimer)
		}
		if(Stage && Stage.timmer) {
			clearInterval(Stage.timmer);
		}
		stopMapServer();
	}
}

/********************************************************* 地图列表**************************************************************************************/
// Calling a map_list service，获取地图列表 
// -------------------------------------------------------------------------

//create a Service client with details of the service's name and service type.
function showMaps() {
	$(".map_list_wrapper").show();
}

function hideMaps() {
	$(".map_list_wrapper").hide();
}

function getMapList() {
	var mapListClient = new ROSLIB.Service({
		ros: ros,
		name: MapListObj.cname,
		serviceType: MapListObj.serviceType
	});

	// create a Service Request. 
	var request = new ROSLIB.ServiceRequest({
		name: 'default'
	});

	// is a ROSLIB.ServiceResponse object.
	mapListClient.callService(request, function(result) {
		//console.log('Result for service call on ' + mapListClient.name + ': ' + result.mapName);
		var mapList = result.mapName.split(';');
		var str = '';
		$.each(mapList, function(index, item) {
			str += '<div><span class="map-name" onclick="setMap(\'' + item + '\')">' + item + '</span><span class="map-edit"  onclick="editMap(\'' + item + '\')">编辑</span><span class="map-del" onclick="delMap(\'' + item + '\')">删除</span></div>'
		})
		var mapListWrapper = $(".map_list_wrapper");
		mapListWrapper.html(str);
	});
}

function setMap(mapName) {
	event.stopPropagation();
	$(".map_list_wrapper").css("display", "none");
	$("#currentMap").val(mapName);
}

function editMap(mapName) {
	var name = prompt("请输入新的地图名字", mapName)
	if(name != null && name != "") {
		//重命名地图
		var renameMapClient = new ROSLIB.Service({
			ros: ros,
			name: RenameMapObj.cname,
			serviceType: RenameMapObj.serviceType
		});
		// create a Service Request.
		var rename_map_req = new ROSLIB.ServiceRequest({
			oldMapName: mapName,
			newMapName: name
		});
		// call the service
		renameMapClient.callService(rename_map_req, function(result) {
			if(result.msg === "success") {
				alert("修改成功");
				getMapList()
			} else {
				alert(result.msg)
			}
		})
	}
}

function delMap(mapName) {
	var r = confirm("你确定删除" + mapName);
	if(r == true) {
		//删除地图
		var delMapClient = new ROSLIB.Service({
			ros: ros,
			name: DelMapObj.cname,
			serviceType: DelMapObj.serviceType
		});
		// create a Service Request.
		var del_map_req = new ROSLIB.ServiceRequest({
			mapName: mapName
		});
		// call the service
		delMapClient.callService(del_map_req, function(result) {
			if(result.msg === "success") {
				alert("删除成功");
				getMapList()
			} else {
				console.log(resut.msg)
			}
		})
	}
}

// call a static_map service from map_server获取选中的静态地图数据，方法2
//-----------------------------------------------------------------------
//create a mapClient object 

function drawStaticMap() {
	mapName = $("#currentMap").val();
	if(!mapName || !ros) {
		return;
	}
	$("#pop").css("display", "none");
	$(".goal_list_wrapper").css("display", "none");

	if(timer) {
		clearInterval(timer);
	}
	var staticMapClient = new ROSLIB.Service({
		ros: ros,
		name: StaticMapObj.cname,
		serviceType: StaticMapObj.serviceType
	});
	var request = new ROSLIB.ServiceRequest({
		name: mapName
	});
	// call the map_server/static_map service
	staticMapClient.callService(request, function(result) {
		//		console.log('Result for service call on ' + staticMapClient.name + ': ' + result.base64Data)
		if(result.base64Data) {
			var px = result.mapWidth;
			var py = result.mapHeight;
			var imgData = result.base64Data;
			var multiple = Math.min((conW / px), (conH / py));
			canvas.width = px * multiple;
			canvas.height = py * multiple;
			var offsetLeft = (conW - px * multiple) / 2;
			$(".container").css("left", offsetLeft + "px")
			if(Stage) {
				clearInterval(Stage.timmer)
				Stage = null;
			}
			Stage = new stage(px, py, multiple, imgData);
			Stage.update(ctx);
			$("#mapServer").prop("checked", true);
			startMapServer();
			$canvas.unbind();
			$canvas.mousedown(function(e) {
				//右键
				if(3 == e.which) {
					if(isExist) {
						$("#pop").css({
							"display": "block",
							"top": (e.clientY),
							"left": e.clientX
						});
					}
					isMouseDown = false;
					//左键
				} else if(1 == e.which) {
					if(isExist) {
						$("#pop").css("display", "none")
					}
					isExist = true;
					Stage.initAngle = null;
					isMouseDown = true;
					drawGoal();
				}
			})
		} else {
			if(Stage) {
				clearInterval(Stage.timmer)
				Stage = null;
			}
		}

	});
}

/*****************************************************************导航点维护**********************************************************************************************************************/

var goalJson;

function getGoalList() {
	if(!mapName || !ros) {
		return;
	}
	//---------------------------------------------------------------------------------------------------------------
	//client object
	var goalListClient = new ROSLIB.Service({
		ros: ros,
		name: GoalListObj.cname,
		serviceType: GoalListObj.serviceType
	});
	//				console.log(mapName);
	//create a service request
	var goal_list_req = new ROSLIB.ServiceRequest({
		mapName: mapName //当前或者指定地图的名字
	});
	//call service
	goalListClient.callService(goal_list_req, function(result) {
		var goalListWrapper = $("#goals");
		if(result.goalList === "goal list not exist") {
			goalListWrapper.html('');
			return;
		}
		$("#goalsModal").modal("show");
		goalJson = JSON.parse(result.goalList);
		var goals = Object.keys(goalJson);
		var str = '';
		$.each(goals, function(index, item) {
			str += '<tr><td><span class="text-info edit-btn" onclick="showGoal(\'' + item + '\')">' + item + '</span></td><td><span class="text-info edit-btn" onclick="editGoal(\'' + item + '\')">编辑</span><span class="text-danger edit-btn" onclick="delGoal(\'' + item + '\')">删除</span><span class="text-info edit-btn" onclick="initHistoryGoal(\'' + item + '\')">初始化</span><span class="text-success edit-btn" onclick="showAndGoGoal(\'' + item + '\')">显示并前往</span></td><tr>'
		})
		goalListWrapper.html(str);
	});
}

function editGoal(goalName) {
	var name = prompt("请输入新的导航点名字", goalName)
	if(name != null && name != "") {
		//重命名导航点
		var renameGoalClient = new ROSLIB.Service({
			ros: ros,
			name: RenameGoalObj.cname,
			serviceType: RenameGoalObj.serviceType
		});
		// create a Service Request.
		var rename_goal_req = new ROSLIB.ServiceRequest({
			mapName: mapName,
			oldGoalName: goalName,
			newGoalName: name
		});
		// call the service
		renameGoalClient.callService(rename_goal_req, function(result) {
			if(result.msg === "success") {
				alert("修改成功");
				getGoalList()
			} else {
				console.log(result.msg)
			}
		})

	}
}

function showGoal(goalName) {
	event.stopPropagation();
	$("#goalsModal").modal('hide');
	var grid = goalJson[goalName];
	Stage.targetName = goalName;
	Stage.targetX = grid.x;
	Stage.targetY = Stage.mapHeight - grid.y;
	Stage.targetR = 4 / Stage.scale;

}

function showAndGoGoal(goalName) {
	showGoal(goalName);
	goGoal(goalName);
}

function goGoal(goalName) {
	//选择导航点前往
	//---------------------------------------------------------------------------------------------------------------
	//publisher object

	var navToGoalClient = new ROSLIB.Service({
		ros: ros,
		name: NavToGoalObj.cname,
		serviceType: NavToGoalObj.serviceType
	});

	var navToGoalReq = new ROSLIB.ServiceRequest({
		mapName: mapName,
		goalName: goalName
	});
	//send request
	navToGoalClient.callService(navToGoalReq, function(result) {
		console.log("go to history goal ....");
		isGoing = true;
		setTimeout(getNavStatus, 1000)
		$("#pauseNav").html("暂停导航")
	})
}

function delGoal(goalName) {
	event.stopPropagation();
	//删除导航点
	//Stage.targetR=0;
	var r = confirm("你确定删除" + goalName);
	if(r == true) {
		//---------------------------------------------------------------------------------------------------------------
		//client object
		var delGoalClient = new ROSLIB.Service({
			ros: ros,
			name: DelGoalObj.cname,
			serviceType: DelGoalObj.serviceType
		});
		//create a service request
		var del_goal_req = new ROSLIB.ServiceRequest({
			mapName: mapName, //当前或者指定地图的名字
			goalName: goalName //需要删除的导航点名
		});
		//call service
		delGoalClient.callService(del_goal_req, function(result) {
			if(result.msg = "success") {
				alert("删除成功")
				getGoalList();
			} else {
				console.log("delGoal", result.msg)
			}

		});

	} else {

	}

}

function initHistoryGoal(goalName) {
	var initHistoryGoalClient = new ROSLIB.Service({
		ros: ros,
		name: InitHistoryGoalObj.cname,
		serviceType: InitHistoryGoalObj.serviceType
	});
	var initHistoryGoalReq = new ROSLIB.ServiceRequest({
		mapName: mapName,
		goalName: goalName
	});

	initHistoryGoalClient.callService(initHistoryGoalReq, function(result) {
		console.log(result)
		if(result.msg === "succuss") {
			$("#goalsModal").modal('hide');
			monitorInitGoalStatus()
		} else {
			alert("通信故障")
		}
	})
}

var initTimer;

function monitorInitGoalStatus() {
	if(initTimer) {
		clearInterval(initTimer);
	}
	initTimer = setInterval(getInitGoalStatus, 1000);
	let isTimerout = false;

	function getInitGoalStatus() {
		var initGoalStatusClient = new ROSLIB.Service({
			ros: ros,
			name: InitGoalStatusObj.cname,
			serviceType: InitGoalStatusObj.serviceType
		});
		var initGoalStatusReq = new ROSLIB.ServiceRequest({});

		initGoalStatusClient.callService(initGoalStatusReq, function(result) {
			console.log(result)
			$("#goalInitStatus").text(result.message)
			if(result.success === true) {
				clearInterval(initTimer);
				alert("初始化完成")
			} else {
				if(isTimerout) {
					clearInterval(initTimer);
					alert("初始化超时")
				}
			}
		})
	}

	setTimeout(function() {
		isTimerout = true;
	}, 30000)

}

/******************************************************************自定义导航**************************************************************/
// 获取地图上导航点的像素坐标，发送该像素坐标消息
// ----------------------------------------------------------------------------------------------------------------------------

//绘制导航点
function drawGoal(e) {
	var origin = $canvas.offset()
	var mouse = getPos(e);
	var x = mouse.x - origin.left;
	var y = mouse.y - origin.top;
	Stage.targetName = "custom";
	Stage.targetX = x / Stage.scale;
	Stage.targetY = y / Stage.scale;
	Stage.targetR = 4 / Stage.scale;

	canvas.addEventListener('mousemove', function(e) {
		if(isMouseDown == true) {
			var mouse = getPos(e);
			c_x = (mouse.x - origin.left) / Stage.scale;
			c_y = (mouse.y - origin.top) / Stage.scale;
			if(c_x !== Stage.targetX || c_y !== Stage.targetY) {
				Stage.initAngle = toTriange([Stage.targetX, Stage.targetY], [c_x, c_y]);
			}
		}
	}, false)

	canvas.addEventListener('mouseup', function(e) {
		isMouseDown = false;

	}, false)

}

function toTriange(start, end) {
	var point = [];
	var x = end[0] - start[0];
	var y = end[1] - start[1];
	var dx1 = start[0] - y * 0.2;
	var dy1 = start[1] + x * 0.2;
	var dx2 = start[0] + y * 0.2;
	var dy2 = start[1] - x * 0.2;
	point.push(dx1);
	point.push(dy1);
	point.push(dx2);
	point.push(dy2);
	point.push(end[0]);
	point.push(end[1]);
	return point
}
//publisher object
function sendCustomGoal() {
	var gridGoalClient = new ROSLIB.Service({
		ros: ros,
		name: SetGoalObj.cname,
		serviceType: SetGoalObj.serviceType
	});

	//request
	var gridGoalReq = new ROSLIB.ServiceRequest({
		grid_x: Math.round(Stage.targetX),
		grid_y: Math.round(Stage.mapHeight - Stage.targetY)
	});

	gridGoalClient.callService(gridGoalReq, function(result) {
		if(result.msg == "success") {
			console.log('go to custom goal....')
			$("#pauseNav").html("暂停导航");
			isGoing = true;
			setTimeout(getNavStatus, 1000);
		} else {
			console.log(result.msg)
		}

	});
	$("#pop").css("display", "none");
	isExist = false;
}

function cancel() {
	$("#pop").css("display", "none");
	Stage.targetR = 0;
	Stage.targetName = "";
	Stage.initAngle = null;
	isExist = false;
}

function saveNavCoordination() {
	if(!mapName || !ros) {
		return
	};
	var goalName = prompt("新增导航点名称");
	//添加导航点
	//client object
	if(goalName != null && goalName != '') {
		var addGoalClient = new ROSLIB.Service({
			ros: ros,
			name: AddGridObj.cname,
			serviceType: AddGridObj.serviceType
		});
		//create a service request
		var add_goal_req = new ROSLIB.ServiceRequest({
			mapName: mapName, //当前或者指定地图的名字
			goalName: goalName //需要添加的导航点名
		});
		//call service
		addGoalClient.callService(add_goal_req, function(result) {
			console.log("save nav goal", result);
			if(result.message === "success") {
				alert("保存成功");
			}
		});
	}
}

/**********************手动导航********************************/
function getPos(e) {
	var mouse = {
		x: 0,
		y: 0
	}
	var e = e || event;

	if(e.pageX || e.pageY) {
		mouse.x = e.pageX;
		mouse.y = e.pageY;
	} else {
		mouse.x = e.pageX + document.body.scrollLeft + document.document.documentElement.scrollLeft;
		mouse.y = e.pageY + document.body.scrollTop + document.document.documentElement.scrollTop;
	}
	return mouse;
}

function cmd(cx, cy) {
	if(!cmdVelPub) {
		return
	}
	var cmd = new ROSLIB.Message({
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
	// console.log(cmd)
	// publish the velocity  TODO:choose different msg
	cmdVelPub.publish(cmd);
	// console.log('publish message on ' + cmdVel.name + ': ' + 'linear {'+twist.linear.x+','+twist.linear.y+','+twist.linear.z+'} angular {'+twist.angular.x+','+twist.angular.y+','+twist.angular.z+'}');
}

function initCustomGoal() {
	$("#pop").css("display", "none");
	if(Stage.initAngle) {
		var param = {
			mapName: mapName,
			pose: {
				x: Math.round(Stage.targetX),
				y: Math.round(Stage.mapHeight - Stage.targetY)
			},
			head: {
				x: Math.round(Stage.initAngle[4]),
				y: Math.round(Stage.mapHeight - Stage.initAngle[5])
			}
		}
		//		console.log(param);
		var initCustomGoalClient = new ROSLIB.Service({
			ros: ros,
			name: InitCustomGoalObj.cname,
			serviceType: InitCustomGoalObj.serviceType
		});
		var initCustomGoalReq = new ROSLIB.ServiceRequest(param);

		initCustomGoalClient.callService(initCustomGoalReq, function(result) {
			if(result.msg === "success") {
				monitorInitGoalStatus()
			} else {
				alert('通信故障')
			}
		})
	} else {
		alert("没有指定方向无法初始化该导航点")
	}

}

/**********************************************************导航状态*******************************************************************/

function editNavStatus(btn) {
	if(!ros) {
		return;
	}
	if(isGoing) {
		var status = $("#navStatus").text();
		if(status !== "ACTIVE") {
			alert("不在导航模式中 无法暂停")
			return;
		}
		$(btn).html("暂停中...");
		var pauseNavClient = new ROSLIB.Service({
			ros: ros,
			name: PauseNavObj.cname,
			serviceType: PauseNavObj.serviceType
		});

		var pauseNavReq = new ROSLIB.ServiceRequest({});
		//send request
		pauseNavClient.callService(pauseNavReq, function(result) {
			if(result.message == "success") {
				isGoing = false;
				$(btn).html("恢复导航");
			} else {
				isGoing = true;
				$(btn).html("暂停导航");
				console.log(result.message)
			};
		})

	} else {
		$(btn).html("恢复中...");
		var resumeNavClient = new ROSLIB.Service({
			ros: ros,
			name: ResumeNavObj.cname,
			serviceType: ResumeNavObj.serviceType
		});

		var resumeNavReq = new ROSLIB.ServiceRequest({});
		//send request
		resumeNavClient.callService(resumeNavReq, function(result) {

			if(result.message == "success") {
				isGoing = true;
				setTimeout(getNavStatus, 1000)
				$(btn).html("暂停导航");
			} else {
				isGoing = false;
				$(btn).html("恢复导航");
				console.log(result.message)
			};
		})
	}
}

function getNavStatus() {
	//	console.log('getNavStatus......')
	if(!ros) {
		return;
	} else {
		var navStatusClient = new ROSLIB.Service({
			ros: ros,
			name: NavStatusObj.cname,
			serviceType: NavStatusObj.serviceType
		});

		var navStatusReq = new ROSLIB.ServiceRequest({});
		var msg = '';
		navStatusClient.callService(navStatusReq, function(result) {
			if(result.success) {
				switch(result.message) {
					case '0':
						msg = "PENDING";
						setTimeout(getNavStatus, 1000)
						break;
					case '1':
						msg = "ACTIVE";
						setTimeout(getNavStatus, 1000)
						break;
					case '2':
						msg = "PREEEMPTED";
						break;
					case '3':
						msg = "SUCCEEDED";
						alert("导航完成");
						break;
					case '4':
						msg = "ABORTED";
						break;

					case '5':
						msg = "REJECTED";
						break;
					case '6':
						msg = "PREEMPTING";

						break;
					case '7':
						msg = "RECALLING";
						break;
					case '8':
						msg = "RECALLED";
						break;
					case '9':
						msg = "LOST";
						break;
				}
			}
			$("#navStatus").text(msg);

		})
	}
}

/****************************************hand switch*****************************************/
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
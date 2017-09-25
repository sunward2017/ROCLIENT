var arrow = function(ox, oy) {
	this.x = ox; //画布平移
	this.y = oy;
	this.color = "#f90";
	this.rotation = 0;
	this.r_x = 0; //指针
	this.r_y = 0;
	this.r = 100; //轮廓半径
}

arrow.prototype.draw = function(context) {
	context.save();
	context.translate(this.x, this.y);
	context.rotate(this.rotation)
	context.fillStyle = this.color;
	context.beginPath();
	context.moveTo(-15, 15);
	context.lineTo(-15, -15)
	context.lineTo(30, 0);
	context.closePath()
	context.fill();
	context.restore();

	context.fillStyle = 'blue';
	context.beginPath();
	context.arc(this.r_x + this.x, this.r_y + this.y, 10, 0, 2 * Math.PI, true);
	context.closePath();
	context.fill();

	context.beginPath();
	context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, true);
	context.closePath();
	context.stroke();
}
	// console.log(Math)

	var cas = document.getElementById('arrow')
	var context = cas.getContext('2d');
//绘制指针

var offsetLeft, offsetTop, Arrow;
window.onload = function() {
	var panel = document.getElementsByClassName("panel")[0];
	var x = cas.width / 2;
	var y = cas.height / 2;
	Arrow = new arrow(x, y);
	offsetLeft = panel.offsetLeft + cas.offsetLeft;
	offsetTop = panel.offsetTop + cas.offsetTop;
	Arrow.draw(context)
}

window.onresize = function() {
	var panel = document.getElementsByClassName("panel")[0];
	offsetLeft = panel.offsetLeft + cas.offsetLeft;
	offsetTop = panel.offsetTop + cas.offsetTop;
}

var c_x, c_y; //相对于cas坐标的位置；
var isMouseDown = false;

cas.addEventListener('mousedown', function(e) {
	isMouseDown = true;
	manualNav("remote_cmdvel")
}, false)

cas.addEventListener('mousemove', function(e) {
	if(isMouseDown == true) {
		var mouse = getPos(e);
		c_x = mouse.x - offsetLeft;
		c_y = mouse.y - offsetTop;
		var dx = c_x - Arrow.x;
		var dy = c_y - Arrow.y;
		Arrow.rotation = Math.atan2(dy, dx);
		var dr = distance(c_x, c_y, Arrow.x, Arrow.y)
		if(dr >= (Arrow.r)) {
			Arrow.r_x = (Arrow.r) * Math.cos(Arrow.rotation)
			Arrow.r_y = (Arrow.r) * Math.sin(Arrow.rotation)
		} else {
			Arrow.r_x = dx;
			Arrow.r_y = dy;
		}
		setTimeout(drawFram, 1000 / 60)
		//requestAnimationFrame(drawFram)
		setTimeout(function() {
			cmd(Arrow.r_x, Arrow.r_y)
		}, 1000 / 100)
	}
}, false)

cas.addEventListener('mouseup', function(e) {
	isMouseDown = false;
	Arrow.r_x = 0;
	Arrow.r_y = 0;
	context.clearRect(0, 0, 300, 300)
	Arrow.draw(context)
	cmd(Arrow.r_x, Arrow.r_y)
	manualNav('nav_cmdvel'); 
}, false)

function drawFram() {
	context.clearRect(0, 0, cas.width, cas.height);
	Arrow.draw(context)
}

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

function distance(x1, y1, x2, y2) {
	var xdiff = x2 - x1;
	var ydiff = y2 - y1;
	return Math.pow((xdiff * xdiff + ydiff * ydiff), 0.5);
}
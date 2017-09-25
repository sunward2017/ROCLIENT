var CmdVelObj = {
	cname: '/remote_cmdvel',
	messageType: 'geometry_msgs/Twist'
};

var RoboLocObj = {
	cname: '/api/grid_pose',
	serviceType: 'api_msgs/GridPose'
};

var LaunchObj = {
    cname: '/api/remote_launch',
    serviceType: 'api_msgs/LaunchCmd'
}

//sensors
var EncObj = {
    cname: '/encoder',
    messageType: 'xunjian_nav/Encoder'
};

var LaserObj = {
	cname: '/api/grid_laser',
	serviceType: 'api_msgs/GridLaser'
}

var SonarObj = {
    cname: '/api/grid_sonar',
    serviceType: 'api_msgs/GridSonar'
}

//map
var MapListObj = {
    cname: '/api/map_list',
    serviceType: 'api_msgs/MapList'
}

var StaticMapObj = {
    cname: '/api/get_static_map',
    serviceType: 'api_msgs/MapData'
}

var MapToPngObj = {
    cname: '/api/map_to_png',
    serviceType: 'api_msgs/MapToPng'
}

var RenameMapObj = {
    cname: '/api/rename_map',
    serviceType: 'api_msgs/RenameMap'
}

var DelMapObj = {
    cname: '/api/del_map',
    serviceType: 'api_msgs/DelMap'
}

//goal
var GoalListObj = {
	cname: '/api/goal_list',
	serviceType: 'api_msgs/GoalList'
}

var NavToGoalObj = {
	cname: '/api/nav_to_goal',
	messageType: 'api_msgs/NavToGoal'
}

var SetGoalObj = {//////GridGoal-->SetGoal
    cname: '/api/set_goal',
    serviceType: 'api_msgs/SetGoal'
}

var DelGoalObj = {
	cname: '/api/del_goal',
	serviceType: 'api_msgs/DelGoal'
}

var AddGridObj = {
	cname: '/api/add_goal',
	serviceType: 'api_msgs/AddGoal'
}

var RenameGoalObj = {
    cname: '/api/rename_goal',
    serviceType: 'api_msgs/RenameGoal'
}

var PauseNavObj={
    cname:'/nav_goal/cancel',
    serviceType:'std_msgs/Trigger'
}

var ResumeNavObj={
	cname:'/nav_goal/resume',
	serviceType:'std_msgs/Trigger'
}

var NavStatusObj={
	cname:'/nav_goal/get_status',
	serviceType:'std_msgs/Trigger'
}


var InitCustomGoalObj={
    cname:'/api/custom_initialize',
    serviceType:'api_msgs/CustomInitialize'
}

var InitHistoryGoalObj ={
	cname:'/api/predefined_initialize',
	serviceType:'api_msgs/PredefinedInitialize'
}

var InitGoalStatusObj={
	cname:'/get_move_status',
	serviceType:'std_srvs/Trigger'
}

var ManuaSwitchlObj = {
	cname:'//mux/select',
	serviceType:'topic_tools/MuxSelect'
}


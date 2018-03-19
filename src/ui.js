// Import ipc
ipc = require('electron').ipcRenderer;

//We define all addresses here to easily debug and change them
let addresses = {
	rotation : '/cob/rotation', //pass the rotation of the robot here (0 - 360)
	position : {
		x : '/cob/position/x', //pass the x position of the robot here (UNUSED)
		y : '/cob/position/y' //pass the y position of the robot here (UNUSED)
	},
	velocity : {
		direction : '/cob/velocity/direction', //pass the direction the robot is moving here (0 - 365)
		magnitude : '/cob/velocity/magnitude' //pass the speed of the robot here (0 - infinity)
	},
	arm : {
		height : '/cob/arm/height', //pass the height of the arm here (0 - 1)
		rotation : '/cob/arm/rotation', //pass the rotation of the arm here (0 - 136)
		cubeGrabbed : '/cob/arm/cube-grabbed', //pass if the cube is grabbed here (UNUSED)
		climbStatus : '/cob/arm/climb-status' //pass the climb status here (UNUSED)
	},
	autonomous : {
		emergencyStop : '/cob/autonomous/emergency-no-auto', //send the autonomous emergency no stop option (true, false)
		side : '/cob/autonomous/side', //send the robot's starting position (0, 1, 2)
		instructions : '/cob/autonomous/instructions', //send the robot's instructions (0, 1, 2, or 3 for side routes, any integer for center)
		enableOpposite : '/cob/autonomous/enable-crossing', //send the enable crossing option (true, false)
	},
	game : {
		autonomous : '/cob/gamedata/is-autonomous', //pass if the robot is in autonomous (true, false)
		teleop : '/cob/gamedata/is-teleop', //pass if the robot is in teleop (true, false)
		enabled : '/cob/gamedata/is-enabled' //pass if the robot is enabled (true, false)
	},
	fms : {
		time : '/cob/fms/time', //pass the time left in the period in seconds (0 - infinity)
		field : '/cob/fms/field', //pass the field game data ('RRR', 'LLL', 'RLR', 'LRL')
		alliance : '/cob/fms/alliance' //pass if the alliance is red (true, false)
	},
	lidar: '/cob/lidar',
	debug : {
		error : '/cob/debug/error' //used for debugging the COB
	}
};

// Define UI elements from index.html
let ui = {
	timer : document.getElementById('timer'), //the timer at the top middle
	example : document.getElementById('example'), //the text at the bottom (UNUSED)
	field : document.getElementById('field'), //the field canvas
	game : {
		status : document.getElementById('robot-status'), //the text that displays the status of the robot
		enabled : false, //if the robot is enabled
		teleop : false, //if the robot is in teleop
		autonomous : false //if the robot is in autonomous
	},
	arm : {
		canvas : document.getElementById('arm'), //the arm canvas
		height : 0.6, //the height of the sled
		rotation : 180 - 44 //the rotation of the snout
	},
	rps : {
		x : 0, //the robot's x position (UNUSED)
		y : 0 //the robot's y position (UNUSED)
	},
	robotState : document.getElementById('robot-state').firstChild, //the connection state of the robot DO NOT CHANGE
	gyro : {
		container : document.getElementById('gyro'), //the gyro svg container
		arm : document.getElementById('rotation-arm') //the gyro arm
	},
	velocity : {
		arm : document.getElementById('velocity-arm'), //the velocity compass' arm
		armRect : document.getElementById('velocity-arm-rect'), //the rectangle portion of the velocity compass' arm
		armTri : document.getElementById('velocity-arm-tri') //the triangle portion of the velocity compass' arm
	},
	autonomous : {
		alliance : false, //our alliance as passed by addresses.autonomous.alliance
		autoChooser : document.getElementById('auto-chooser'), //the selection box for sides
		fieldConfigDisplay : document.getElementById('auto-field-config'), //the field data text display (as in RRR, etc.)
		leftBox : document.getElementById('auto-left'), //the div containing all left auto settings
		centerBox : document.getElementById('auto-center'), //the div containing all center auto settings
		rightBox : document.getElementById('auto-right'), //the div containing all right auto settings
		left : {
			instructions : 0, //the left instructions value
			doEasiestButton : document.getElementById('button-auto-left-choice-easy'), //the left do easiest button
			doSwitchButton : document.getElementById('button-auto-left-choice-switch'), //the left force switch button
			doScaleButton : document.getElementById('button-auto-left-choice-scale'), //the left force scale button
			doBaselineButton : document.getElementById('button-auto-left-choice-baseline') //the left baseline button
		},
		center : {
			delay : 0, //the delay for center autonomous
			delayCounterUp : document.getElementById('button-auto-center-delay-up'), //the delay counter up button
			delayCounterDown : document.getElementById('button-auto-center-delay-down'), //the delay counter down button
			delayCounter : document.getElementById('auto-center-display') //the delay counter itself
		},
		right : {
			instructions : 0, //the right instructions value
			doEasiestButton : document.getElementById('button-auto-right-choice-easy'), //the right do easiest button
			doSwitchButton : document.getElementById('button-auto-right-choice-switch'), //the right force switch button
			doScaleButton : document.getElementById('button-auto-right-choice-scale'), //the right force scale button
			doBaselineButton : document.getElementById('button-auto-right-choice-baseline') //the right force baseline button
		},
		enableOppositeButton : document.getElementById('button-auto-checkbox-enable-opposite'), //the enable crossing button
		enableOpposite : true, //the enable crossing value
		emergencyStopButton : document.getElementById('button-auto-checkbox-emergency-no-auto'), //the emergency stop button
		emergencyStop : false //the emergency stop button value
	},
	lidarText: document.getElementById('lidar-text')
};

// Define NetworkTable Address
let address = document.getElementById('connect-address'),
	connect = document.getElementById('connect');

// Set function to be called when robot dis/connects
NetworkTables.addRobotConnectionListener(onRobotConnection, false);

// Sets function to be called when any NetworkTables key/value changes
NetworkTables.addGlobalListener(onValueChanged, true);

// Function for hiding the connect box
let escCount = 2;
onkeydown = key => {
	if (key.key === 'Escape') {
		setTimeout(() => {
			escCount = 0;
		}, 400);
		escCount++;
		if (escCount === 2) document.body.classList.toggle('login-close', true);
	}
	else console.log(key.key);
};

/**
 * Function to be called when robot connects
 * @param {boolean} connected
 */
function onRobotConnection(connected) {
	var state = connected ? 'Robot connected!' : 'Robot disconnected.';
	console.log(state);
	ui.robotState.data = state;
	if (connected) {
		// On connect hide the connect popup
		document.body.classList.toggle('login-close', true);
	} else {
		// On disconnect show the connect popup
		document.body.classList.toggle('login-close', false);
		// Add Enter key handler
		address.onkeydown = ev => {
			if (ev.key === 'Enter') {
				connect.click();
			}
		};
		// Enable the input and the button
		address.disabled = false;
		connect.disabled = false;
		connect.firstChild.data = 'Connect';
		// CHANGE THIS VALUE TO YOUR ROBOT'S IP ADDRESS
		address.value = 'roborio-623-frc.local';
		address.focus();
		address.setSelectionRange(8, 12);
		// On click try to connect and disable the input and the button
		connect.onclick = () => {
			ipc.send('connect', address.value);
			address.disabled = true;
			connect.disabled = true;
			connect.firstChild.data = 'Connecting';
		};
	}
	
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~ NETWORK TABLES INITIAL VALUES ~~~~~~~
	//We set the default values for the NetworkTable addresses to avoid robot crashes.

	NetworkTables.putValue('' + addresses.rotation, 0); //forwards
	NetworkTables.putValue('' + addresses.position.x, 0); //UNUSED
	NetworkTables.putValue('' + addresses.position.y, 0); //UNUSED
	NetworkTables.putValue('' + addresses.velocity.direction, 0); //forwards
	NetworkTables.putValue('' + addresses.velocity.magnitude, 0); //not moving
	NetworkTables.putValue('' + addresses.arm.cubeGrabbed, false) //UNUSED
	NetworkTables.putValue('' + addresses.arm.climbStatus, 0); //UNUSED
	NetworkTables.putValue('' + addresses.autonomous.emergencyStop, false); //no emergency stop
	NetworkTables.putValue('' + addresses.autonomous.side, 0); //left
	NetworkTables.putValue('' + addresses.autonomous.instructions, 0); //do easy || delay of 0
	NetworkTables.putValue('' + addresses.autonomous.enableOpposite, true); //enable opposite side
	NetworkTables.putValue('' + addresses.fms.time, 0); //0:00
	NetworkTables.putValue('' + addresses.fms.field, "YUM"); //lol
	NetworkTables.putValue('' + addresses.fms.alliance, true); //red
	NetworkTables.putValue('' + addresses.arm.height, 0.6); //initial height just above pivot
	NetworkTables.putValue('' + addresses.arm.rotation, 0); //begin folded
	NetworkTables.putValue('' + addresses.game.autonomous, false); //not in auto
	NetworkTables.putValue('' + addresses.game.teleop, false); //not in tele
	NetworkTables.putValue('' + addresses.game.enabled, false); //disabled
	
	//reset the buttons
	resetAutoOptions();
	
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~ NETWORK TABLES INITIAL VALUES ~~~~~~~
//We set the default values for the NetworkTable addresses to avoid robot crashes.

NetworkTables.putValue('' + addresses.rotation, 0); //forwards
NetworkTables.putValue('' + addresses.position.x, 0); //UNUSED
NetworkTables.putValue('' + addresses.position.y, 0); //UNUSED
NetworkTables.putValue('' + addresses.velocity.direction, 0); //forwards
NetworkTables.putValue('' + addresses.velocity.magnitude, 0); //not moving
NetworkTables.putValue('' + addresses.arm.cubeGrabbed, false) //UNUSED
NetworkTables.putValue('' + addresses.arm.climbStatus, 0); //UNUSED
NetworkTables.putValue('' + addresses.autonomous.emergencyStop, false); //no emergency stop
NetworkTables.putValue('' + addresses.autonomous.side, 0); //left
NetworkTables.putValue('' + addresses.autonomous.instructions, 0); //do easy || delay of 0
NetworkTables.putValue('' + addresses.autonomous.enableOpposite, true); //enable opposite side
NetworkTables.putValue('' + addresses.fms.time, 0); //0:00
NetworkTables.putValue('' + addresses.fms.field, "YUM"); //lol
NetworkTables.putValue('' + addresses.fms.alliance, true); //red
NetworkTables.putValue('' + addresses.arm.height, 0.6); //initial height just above pivot
NetworkTables.putValue('' + addresses.arm.rotation, 0); //begin folded
NetworkTables.putValue('' + addresses.game.autonomous, false); //not in auto
NetworkTables.putValue('' + addresses.game.teleop, false); //not in tele
NetworkTables.putValue('' + addresses.game.enabled, false); //disabled

//~~~~~~~~~~~~~~~~~~~~~~~~~~~ FIELD CANVAS~~~~~~~~~~~~~~~~~~~~~~~~~
//autonomous is not running by default
let autonomousRunning = false;

//The functions for robot position are unused and thus commented out.
/*
//rps' x network key listener function
let rps_xf = (key, value) => {
	//TODO trim to max and min, scale
	ui.rps.x = value + horizontalDisplacement;
	//redraw field (we only put this in x because we don't want to redraw too often)
	drawField();
}
NetworkTables.addKeyListener('' + addresses.position.x, rps_xf);
NetworkTables.putValue('' + addresses.position.x, 0);
//rps' y network key listener function
let rps_yf = (key, value) => {
	//TODO trim to max and min, scale
	ui.rps.y = value;

}
NetworkTables.addKeyListener('' + addresses.position.y, rps_yf);
NetworkTables.putValue('' + addresses.position.y, 0);
*/

//Image declarations for drawField()
//We declare them here because the images won't have to load every time we call drawField().
let blueFieldImg = new Image();
blueFieldImg.src = "FieldBlue.png";
let redFieldImg = new Image();
redFieldImg.src = "FieldRed.png";
let rps = new Image();
rps.src = "paw.png";
let death = new Image();
death.src = "Death.png";

drawField();
//Function to redraw the entire field and everything on it
function drawField() {

	//define variables
	let context = ui.field.getContext("2d");
	let fieldImg = null;
	let alliance = ui.autonomous.alliance;
	if (alliance == 'true' || alliance == true)
		fieldImg = redFieldImg;
	else
		fieldImg = blueFieldImg;
	//variables to change appearance
	let horizontalDisplacement = 103;

	//clear the context
	context.clearRect(0, 0, ui.field.width, ui.field.height);

	//begin drawing
	if (context != null) {
		//WHEN DRAWING THE FIELD-- WE DRAW THE LOWER ITEMS FIRST

		//First draw the field
		context.drawImage(fieldImg, horizontalDisplacement, 0, 248, 500);

		//draw the field orientation if we are in teleop
		if (NetworkTables.getValue('' + addresses.game.teleop)) {
			//Draw the colors and the null zone
			let ourColor = alliance ? "rgba(234, 0, 0, 0.68)" : "rgba(0, 0, 234, 0.68)";
			let theirColor = alliance ? "rgba(0, 0, 234, 0.6)" : "rgba(234, 0, 0, 0.68)";
	
			//far switch
			context.fillStyle = isOurs(0, 2) ? '' + ourColor : '' + theirColor;
			context.fillRect(horizontalDisplacement + 75, 125, 22, 33);
			context.fillStyle = isOurs(1, 2) ? '' + ourColor : '' + theirColor;
			context.fillRect(horizontalDisplacement + 150, 125, 22, 33);
	
			//scale
			context.fillStyle = isOurs(0, 1) ? '' + ourColor : '' + theirColor;
			context.fillRect(horizontalDisplacement + 62, 109 + 125, 22, 33);
			context.fillStyle = isOurs(1, 1) ? '' + ourColor : '' + theirColor;
			context.fillRect(horizontalDisplacement + 163, 109 + 125, 22, 33);
	
			//near switch
			context.fillStyle = isOurs(0, 0) ? '' + ourColor : '' + theirColor;
			context.fillRect(horizontalDisplacement + 75, 218 + 125, 22, 33);
			context.fillStyle = isOurs(1, 0) ? '' + ourColor : '' + theirColor;
			context.fillRect(horizontalDisplacement + 150, 218 + 125, 22, 33);
	
			//null zone
			context.fillStyle = 'rgba(0, 0, 0, 0.8)';
			if (!isOurs(0, 1)) {
				context.fillRect(horizontalDisplacement + 10, 224, 70, 52);
				context.drawImage(death, horizontalDisplacement + 10 + 35 - 12, 224 + 12, 25, 25);
			} else {
				context.fillRect(horizontalDisplacement + 10 + 160, 224, 70, 52);
				context.drawImage(death, horizontalDisplacement + 10 + 35 + 160 - 12, 225 + 12, 25, 25);
	
			}
		}
		
		//draw the predicted autonomous routes (this does nothing if we are in tele)
		drawAutonomousRoutes();

		//Draw the robot's position (we do this last so that everything is under it) UNUSED NOW
		//context.drawImage(rps, ui.rps.x - 15, ui.rps.y - 15, 30, 30);
	}
}

//Function to redraw the arm
function drawArm() {
	//first define variables
	let armHorizontalDisplacement = 20;
	let armContext = ui.arm.canvas.getContext("2d");
	let redraw = false;
	armContext.fillStyle = "silver";

	//save the default context
	armContext.save();

	//clear the arm context to redraw
	armContext.clearRect(0, 0, ui.arm.canvas.width, ui.arm.canvas.height);

	//let 400px be the total height of the arm
	//the bottom part of the arm = .49 * 400 = 198px (with a 202 displacement)
	//the top part of the arm = .51 * 400 = 202px
	//the width of both arms = .03 * 400 = 12px
	armContext.fillRect(armHorizontalDisplacement, 50 + 202, 12, 198);

	//first translate the context to the top of the lower arm
	armContext.translate(armHorizontalDisplacement + 6, 50 + 202);
	//rotate to proper angle
	//armContext.rotate(ui.arm.rotation * Math.PI / 180);
	//translate the context to the top
	armContext.translate(-6, -202);
	//draw the top arm
	armContext.fillRect(0, 0, 12, 202);

	//lifty thing (translate)
	//armContext.restore();
	//armContext.save();
	armContext.translate(12, 202 + 198);
	armContext.translate(0, -(ui.arm.height * 380));
	//lifty thing (draw)
	armContext.fillRect(2, -8, 40, 8);
	armContext.fillRect(0, -20, 10, 15);

	//pivot
	armContext.restore();
	armContext.fillStyle = "black";
	armContext.arc(armHorizontalDisplacement + 6, 50 + 202, 8, 0, 2 * Math.PI);
	armContext.fill();

}
drawArm();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**** KEY Listeners ****/

//Gyro rotation
let updateRotation = (key, value) => {
	ui.gyro.arm.style.transform = "rotate(" + value + "deg)";
}
NetworkTables.addKeyListener('' + addresses.rotation, updateRotation);

//Velocity direction detection
//Gyro rotation
let updateVelocityRotation = (key, value) => {
	ui.velocity.arm.style.transform = "rotate(" + value + "deg)";
}
NetworkTables.addKeyListener('' + addresses.velocity.direction, updateVelocityRotation);

//Velocity magnitude detection
const scaleConst = 115 / 65;
let updateVelocityMagnitude = (key, value) => {
	//let 1 be the maximum value the arrow can be, and 0 be the minimum (not moving)
	//first trim the value just in case
	//if (value < 0) value = 0;
	//if (value > 1) value = 1;
	//we set our initial scale (currentScale) relative to the max size (115px)
	//we can now multiply that initial factor by value to get the real scale.
	//scale the armrect
	ui.velocity.arm.setAttribute("class", (value >= 0.05) ? "velocity-arm-on" : "velocity-arm-off");
	ui.velocity.armRect.style.transform = "scale(1, " + (value * scaleConst) + ")";
	ui.velocity.armTri.style.transform = "translate(0px, " + (48 - 103 * value) + "px)";
//NetworkTables.putValue("/debug/scaleConst", scaleConst);
}
NetworkTables.addKeyListener('' + addresses.velocity.magnitude, updateVelocityMagnitude);

//timer
NetworkTables.addKeyListener('' + addresses.fms.time, (key, value) => {
	let time = Math.round(value);
	ui.timer.innerHTML = time < 0 ? '0:00' : Math.floor(time / 60) + ':' + (time % 60 < 10 ? '0' : '') + time % 60;
	ui.timer.setAttribute("class", (ui.game.teleop && value <= 30 && value > 27)? "blink" : "no-blink");
});

//arm rotation
NetworkTables.addKeyListener('' + addresses.arm.rotation, (key, value) => {
	//ui.arm.rotation = value;
	//drawArm();
});

//arm height
NetworkTables.addKeyListener('' + addresses.arm.height, (key, value) => {
	//random jump protection
	if (value - ui.arm.height < 0.05) {
		ui.arm.height = value;
		drawArm();
	}
});

//Robot Status Handlers
NetworkTables.addKeyListener('' + addresses.game.enabled, (key, value) => {
	ui.game.enabled = value;
	updateRobotStatus();
});

//Autonomous status handler
NetworkTables.addKeyListener('' + addresses.game.autonomous, (key, value) => {
	ui.game.autonomous = value;
	updateRobotStatus();
});

//Teleop status handler
NetworkTables.addKeyListener('' + addresses.game.teleop, (key, value) => {
	ui.game.teleop = value;
	updateRobotStatus();
	drawField();
});

//update the robot status text (triple ternary operator!!!)
function updateRobotStatus() {
	ui.game.status.innerHTML = (ui.game.enabled) ? ((ui.game.autonomous) ? "Autonomous" : ((ui.game.teleop) ? "TeleOp" : "Enabled")) : "Disabled";
}

NetworkTables.addKeyListener('' + addresses.lidar, (key, value) => {
	ui.lidarText.innerHTML = "LIDAR: " + value;
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ AUTONOMOUS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//update the autonomous options at start
updateAutoOptions();

//field config display
NetworkTables.addKeyListener('' + addresses.fms.field, (key, value) => {
	ui.autonomous.fieldConfigDisplay.innerHTML = value;
	updateAutoOptions();
	drawField();
});

//field config display handler (temporary)
NetworkTables.addKeyListener('/FMSInfo/GameSpecificMessage', (key, value) => {
	ui.autonomous.fieldConfigDisplay.innerHTML = value;
	updateAutoOptions();
	drawField();
});

//alliance
NetworkTables.addKeyListener('' + addresses.fms.alliance, (key, value) => {
	ui.autonomous.alliance = value;
	drawField();
});
NetworkTables.putValue('' + addresses.fms.alliance, false);

//Auto chooser 
ui.autonomous.autoChooser.onchange = function() {
	NetworkTables.putValue('' + addresses.autonomous.side, ui.autonomous.autoChooser.selectedIndex);
	switch (ui.autonomous.autoChooser.selectedIndex) {
	case 1: {
		NetworkTables.putValue('' + addresses.autonomous.instructions, ui.autonomous.left.instructions);
		break;
	}
	case 2: {
		NetworkTables.putValue('' + addresses.autonomous.instructions, ui.autonomous.center.delay);
		break;
	}
	case 3: {
		NetworkTables.putValue('' + addresses.autonomous.instructions, ui.autonomous.right.instructions);
	}
	}

	drawField();
	updateAutoOptions();
	drawAutonomousRoutes();

};

//CENTER CONFIG OPTIONS: when changed, update autonomous data
ui.autonomous.center.delayCounterUp.onclick = function() {
	if (ui.autonomous.center.delay < 15) {
		ui.autonomous.center.delay += 1;
		ui.autonomous.center.delayCounter.innerHTML = ui.autonomous.center.delay;
		NetworkTables.putValue('' + addresses.autonomous.instructions, ui.autonomous.center.delay);
	}
}

ui.autonomous.center.delayCounterDown.onclick = function() {
	if (ui.autonomous.center.delay > 0) {
		ui.autonomous.center.delay -= 1;
		ui.autonomous.center.delayCounter.innerHTML = ui.autonomous.center.delay;
		NetworkTables.putValue('' + addresses.autonomous.instructions, ui.autonomous.center.delay);
	}
}

//All Autonomous
//The enable opposite button
ui.autonomous.enableOppositeButton.onclick = function() {
	ui.autonomous.enableOpposite = !ui.autonomous.enableOpposite;
	NetworkTables.putValue('' + addresses.autonomous.enableOpposite, ui.autonomous.enableOpposite);
	ui.autonomous.enableOppositeButton.setAttribute("class", (ui.autonomous.enableOpposite) ? "button-on" : "button-off");
	drawField();
	drawAutonomousRoutes();

}

//Auto doSomethingButton
ui.autonomous.emergencyStopButton.onclick = function() {
	ui.autonomous.emergencyStop = !ui.autonomous.emergencyStop;
	NetworkTables.putValue('' + addresses.autonomous.emergencyStop, ui.autonomous.emergencyStop);
	ui.autonomous.emergencyStopButton.setAttribute("class", (ui.autonomous.emergencyStop) ? "button-on" : "button-off");
	updateAutoOptions();
	drawField();
	drawAutonomousRoutes();

}

//LEFT CONFIG OPTIONS: when changed, update autonomous NetworkTable value and redraw field
//TODO

//the left do easiest handler
ui.autonomous.left.doEasiestButton.onclick = function() {
	ui.autonomous.left.instructions = 0;
	NetworkTables.putValue('' + addresses.autonomous.instructions, 0);
	ui.autonomous.left.doEasiestButton.setAttribute("class", "button-on");
	ui.autonomous.left.doSwitchButton.setAttribute("class", "button-off");
	ui.autonomous.left.doScaleButton.setAttribute("class", "button-off");
	ui.autonomous.left.doBaselineButton.setAttribute("class", "button-off");
	drawField();
	drawAutonomousRoutes();
}

//the left do switch handler
ui.autonomous.left.doSwitchButton.onclick = function() {
	ui.autonomous.left.instructions = 1;
	NetworkTables.putValue('' + addresses.autonomous.instructions, 1);
	ui.autonomous.left.doEasiestButton.setAttribute("class", "button-off");
	ui.autonomous.left.doSwitchButton.setAttribute("class", "button-on");
	ui.autonomous.left.doScaleButton.setAttribute("class", "button-off");
	ui.autonomous.left.doBaselineButton.setAttribute("class", "button-off");
	drawField();
	drawAutonomousRoutes();
}

//the left do scale handler
ui.autonomous.left.doScaleButton.onclick = function() {
	ui.autonomous.left.instructions = 2;
	NetworkTables.putValue('' + addresses.autonomous.instructions, 2);
	ui.autonomous.left.doEasiestButton.setAttribute("class", "button-off");
	ui.autonomous.left.doSwitchButton.setAttribute("class", "button-off");
	ui.autonomous.left.doScaleButton.setAttribute("class", "button-on");
	ui.autonomous.left.doBaselineButton.setAttribute("class", "button-off");
	drawField();
	drawAutonomousRoutes();
}

//the left do baseline handler
ui.autonomous.left.doBaselineButton.onclick = function() {
	ui.autonomous.left.instructions = 3;
	NetworkTables.putValue('' + addresses.autonomous.instructions, 3);
	ui.autonomous.left.doEasiestButton.setAttribute("class", "button-off");
	ui.autonomous.left.doSwitchButton.setAttribute("class", "button-off");
	ui.autonomous.left.doScaleButton.setAttribute("class", "button-off");
	ui.autonomous.left.doBaselineButton.setAttribute("class", "button-on");
	drawField();
	drawAutonomousRoutes();
}

//RIGHT CONFIG OPTIONS: when changed, update autonomous NetworkTable value and redraw field

//the right do easy handler
ui.autonomous.right.doEasiestButton.onclick = function() {
	ui.autonomous.right.instructions = 0;
	NetworkTables.putValue('' + addresses.autonomous.instructions, 0);
	ui.autonomous.right.doEasiestButton.setAttribute("class", "button-on");
	ui.autonomous.right.doSwitchButton.setAttribute("class", "button-off");
	ui.autonomous.right.doScaleButton.setAttribute("class", "button-off");
	ui.autonomous.right.doBaselineButton.setAttribute("class", "button-off");
	drawField();
	drawAutonomousRoutes();
}

//the right do switch handler
ui.autonomous.right.doSwitchButton.onclick = function() {
	ui.autonomous.right.instructions = 1;
	NetworkTables.putValue('' + addresses.autonomous.instructions, 1);
	ui.autonomous.right.doEasiestButton.setAttribute("class", "button-off");
	ui.autonomous.right.doSwitchButton.setAttribute("class", "button-on");
	ui.autonomous.right.doScaleButton.setAttribute("class", "button-off");
	ui.autonomous.right.doBaselineButton.setAttribute("class", "button-off");
	drawField();
	drawAutonomousRoutes();
}

//the right do scale handler
ui.autonomous.right.doScaleButton.onclick = function() {
	ui.autonomous.right.instructions = 2;
	NetworkTables.putValue('' + addresses.autonomous.instructions, 2);
	ui.autonomous.right.doEasiestButton.setAttribute("class", "button-off");
	ui.autonomous.right.doSwitchButton.setAttribute("class", "button-off");
	ui.autonomous.right.doScaleButton.setAttribute("class", "button-on");
	ui.autonomous.right.doBaselineButton.setAttribute("class", "button-off");
	drawField();
	drawAutonomousRoutes();
}

//the right do baseline handler
ui.autonomous.right.doBaselineButton.onclick = function() {
	ui.autonomous.right.instructions = 3;
	NetworkTables.putValue('' + addresses.autonomous.instructions, 3);
	ui.autonomous.right.doEasiestButton.setAttribute("class", "button-off");
	ui.autonomous.right.doSwitchButton.setAttribute("class", "button-off");
	ui.autonomous.right.doScaleButton.setAttribute("class", "button-off");
	ui.autonomous.right.doBaselineButton.setAttribute("class", "button-on");
	drawField();
	drawAutonomousRoutes();
}

//UPDATE AUTO OPTIONS~~~~ This updates the ui when a certain value has changed.
function updateAutoOptions() {

	//first hide everything
	ui.autonomous.leftBox.setAttribute("class", "auto-disabled");
	ui.autonomous.centerBox.setAttribute("class", "auto-disabled");
	ui.autonomous.rightBox.setAttribute("class", "auto-disabled");
	ui.autonomous.enableOppositeButton.setAttribute("class", (ui.autonomous.enableOpposite)? "button-on" : "button-off");

	//get key values
	let team = NetworkTables.getValue(addresses.fms.team); //true for red, false for blue
	let fieldData = NetworkTables.getValue(addresses.fms.field); //String to represent the randomization of field
	let position = ui.autonomous.autoChooser.selectedIndex - 1; //String to represent autonomous start pos
	//check all possible permutations and update the board
	if (!ui.autonomous.emergencyStop) {
		//left
		if (position == 0) {
			//hide all right & center config options
			//display all left config options
			ui.autonomous.leftBox.setAttribute("class", "auto-left");
		} else if (position == 1) {
			//hide all left & right config options
			//display all center config options
			ui.autonomous.centerBox.setAttribute("class", "auto-center");
			ui.autonomous.enableOppositeButton.setAttribute("class", "auto-disabled");
		} else if (position == 2) {
			//hide all left & center config options
			//display all right config options
			ui.autonomous.rightBox.setAttribute("class", "auto-right");
		}

	} else {
		//hide everything
		ui.autonomous.enableOppositeButton.setAttribute("class", "auto-disabled");
	}
}

//reset the cob & its auto functions (call this on reconnect)
function resetAutoOptions() {
	
	//instruction reset
	ui.autonomous.left.instructions = 0;
	ui.autonomous.center.delay = 0;
	ui.autonomous.right.instructions = 0;
	
	//auto chooser reset
	ui.autonomous.autoChooser.selectedIndex = 0;
	
	//left buttons
	ui.autonomous.left.doEasiestButton.setAttribute("class", "button-on");
	ui.autonomous.left.doSwitchButton.setAttribute("class", "button-off");
	ui.autonomous.left.doScaleButton.setAttribute("class", "button-off");
	ui.autonomous.left.doBaselineButton.setAttribute("class", "button-off");

	//center button
	ui.autonomous.center.delayCounter.innerHTML = 0;

	//right buttons
	ui.autonomous.right.doEasiestButton.setAttribute("class", "button-on");
	ui.autonomous.right.doSwitchButton.setAttribute("class", "button-off");
	ui.autonomous.right.doScaleButton.setAttribute("class", "button-off");
	ui.autonomous.right.doBaselineButton.setAttribute("class", "button-off");

	//other buttons
	ui.autonomous.enableOppositeButton.setAttribute("class", "button-on");
	ui.autonomous.enableOpposite = true;
	ui.autonomous.emergencyStopButton.setAttribute("class", "button-off");
	ui.autonomous.emergencyStop = false;
	
	updateAutoOptions();
}

//Autonomous pictures
let autoImageCenter = new Image();
let autoImageSwitchNear = new Image();
let autoImageSwitchFar = new Image();
let autoImageScaleNear = new Image();
let autoImageScaleFar = new Image();
let autoImageSwitchOptimize = new Image();
let autoImageScaleOptimize = new Image();
let autoImageBaseline = new Image();

let autoImageSwitchNearReversed = new Image();
let autoImageSwitchFarReversed = new Image();
let autoImageScaleNearReversed = new Image();
let autoImageScaleFarReversed = new Image();
let autoImageSwitchOptimizeReversed = new Image();
let autoImageScaleOptimizeReversed = new Image();
let autoImageBaselineReversed = new Image();

autoImageCenter.src = "autonomous/Center.png";
autoImageSwitchNear.src = "autonomous/SwitchNear.png";
autoImageSwitchFar.src = "autonomous/SwitchFar.png";
autoImageScaleNear.src = "autonomous/ScaleNear.png";
autoImageScaleFar.src = "autonomous/ScaleFar.png";
autoImageSwitchOptimize.src = "autonomous/OptimizeSwitch.png";
autoImageScaleOptimize.src = "autonomous/OptimizeScale.png";
autoImageBaseline.src = "autonomous/Baseline.png";

autoImageSwitchNearReversed.src = "autonomous/SwitchNearReversed.png";
autoImageSwitchFarReversed.src = "autonomous/SwitchFarReversed.png";
autoImageScaleNearReversed.src = "autonomous/ScaleNearReversed.png";
autoImageScaleFarReversed.src = "autonomous/ScaleFarReversed.png";
autoImageSwitchOptimizeReversed.src = "autonomous/OptimizeSwitchReversed.png";
autoImageScaleOptimizeReversed.src = "autonomous/OptimizeScaleReversed.png";
autoImageBaselineReversed.src = "autonomous/BaselineReversed.png";

//draws the autonomous routes based on selected options if teleop is not running
function drawAutonomousRoutes() {
	if (!NetworkTables.getValue('' + addresses.game.teleop) && !ui.autonomous.emergencyStop) {
		//first define the variables
		let context = ui.field.getContext("2d");
		let side = ui.autonomous.autoChooser.selectedIndex - 1;
		let instructions = NetworkTables.getValue('' + addresses.autonomous.instructions);
		let doSwitch = instructions == 0 || instructions == 1;
		let doScale = instructions == 0 || instructions == 2;
		let doBaseline = instructions == 3;
		let optimize = ui.autonomous.enableOpposite;
		let horizontalDisplacement = 103;

		//draw the routes needed
		if (side == 1) { //center
			context.drawImage(autoImageCenter, horizontalDisplacement, 0, 248, 500);
		} else if (side == 0) { //left

			if (doSwitch) {
				context.drawImage(autoImageSwitchNear, horizontalDisplacement, 0, 248, 500);
				if (optimize) {
					context.drawImage(autoImageSwitchOptimize, horizontalDisplacement, 0, 248, 500);
					context.drawImage(autoImageSwitchFar, horizontalDisplacement, 0, 248, 500);
				}
			}
			if (doScale) {
				context.drawImage(autoImageScaleNear, horizontalDisplacement, 0, 248, 500);
				if (optimize) {
					context.drawImage(autoImageScaleOptimize, horizontalDisplacement, 0, 248, 500);
					context.drawImage(autoImageScaleFar, horizontalDisplacement, 0, 248, 500);
				}
			}
			if (doBaseline || !optimize) {
				context.drawImage(autoImageBaseline, horizontalDisplacement, 0, 248, 500);
			}
			
		} else if (side == 2) {//right

			if (doSwitch) {
				context.drawImage(autoImageSwitchNearReversed, horizontalDisplacement, 0, 248, 500);
				if (optimize) {
					context.drawImage(autoImageSwitchOptimizeReversed, horizontalDisplacement, 0, 248, 500);
					context.drawImage(autoImageSwitchFarReversed, horizontalDisplacement, 0, 248, 500);
				}
			}
			if (doScale) {
				context.drawImage(autoImageScaleNearReversed, horizontalDisplacement, 0, 248, 500);
				if (optimize) {
					context.drawImage(autoImageScaleOptimizeReversed, horizontalDisplacement, 0, 248, 500);
					context.drawImage(autoImageScaleFarReversed, horizontalDisplacement, 0, 248, 500);
				}
			}
			if (doBaseline || !optimize) {
				context.drawImage(autoImageBaselineReversed, horizontalDisplacement, 0, 248, 500);
			}
		}
	}
}



//a function to use that returns whether or not a side of the switch or scale is our alliance's. See code:
/*	.----------.
 * 	|		   |
 * 	| 0,2  1,2 |
 *  | 		   |
 *  | 0,1  1,1 |
 *  | 		   |
 *  | 0,0  1,0 |
 *  |          |
 *  '----------'
 *  	YOU
 */
const SIDES = "RL";
function isOurs(side, number) {
	let data = NetworkTables.getValue('' + addresses.fms.field);
	return (('' + data).charAt(number) == "LR".charAt(side));
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/**
 * Global Listener that runs whenever any value changes
 * @param {string} key
 * @param value
 * @param {boolean} isNew
 */
function onValueChanged(key, value, isNew) {
	// Sometimes, NetworkTables will pass booleans as strings. This corrects for that.
	if (value === 'true') {
		value = true;
	} else if (value === 'false') {
		value = false;
	}
	// The following code manages tuning section of the interface.
	// This section displays a list of all NetworkTables variables (that start with /SmartDashboard/) and allows you to directly manipulate them.
	var propName = key.substring(16, key.length);
	// Check if value is new and doesn't have a spot on the list yet
	if (isNew && !document.getElementsByName(propName)[0]) {
		// Make sure name starts with /SmartDashboard/. Properties that don't are technical and don't need to be shown on the list.
		if (/^\/SmartDashboard\//.test(key)) {
			// Make a new div for this value
			var div = document.createElement('div'); // Make div
			ui.tuning.list.appendChild(div); // Add the div to the page
			var p = document.createElement('p'); // Make a <p> to display the name of the property
			p.appendChild(document.createTextNode(propName)); // Make content of <p> have the name of the NetworkTables value
			div.appendChild(p); // Put <p> in div
			var input = document.createElement('input'); // Create input
			input.name = propName; // Make its name property be the name of the NetworkTables value
			input.value = value; // Set
			// The following statement figures out which data type the variable is.
			// If it's a boolean, it will make the input be a checkbox. If it's a number,
			// it will make it a number chooser with up and down arrows in the box. Otherwise, it will make it a textbox.
			if (typeof value === 'boolean') {
				input.type = 'checkbox';
				input.checked = value; // value property doesn't work on checkboxes, we'll need to use the checked property instead
				input.onchange = function() {
					// For booleans, send bool of whether or not checkbox is checked
					NetworkTables.putValue(key, this.checked);
				};
			} else if (!isNaN(value)) {
				input.type = 'number';
				input.onchange = function() {
					// For number values, send value of input as an int.
					NetworkTables.putValue(key, parseInt(this.value));
				};
			} else {
				input.type = 'text';
				input.onchange = function() {
					// For normal text values, just send the value.
					NetworkTables.putValue(key, this.value);
				};
			}
			// Put the input into the div.
			div.appendChild(input);
		}
	} else {
		// Find already-existing input for changing this variable
		var oldInput = document.getElementsByName(propName)[0];
		if (oldInput) {
			if (oldInput.type === 'checkbox')
				oldInput.checked = value;
			else
				oldInput.value = value;
		}
		else console.log('Error: Non-new variable ' + key + ' not present in tuning list!');
	}
}
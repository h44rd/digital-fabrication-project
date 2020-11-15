//mic input control
let mic;
let volume_window;
let window_length;
let filter_length;
let r, theta, H, E, nozzle_width, s_f, l_r;

var slider = document.getElementById("myRange");
var r_element = document.getElementById("r");
var theta_element = document.getElementById("theta");
var H_element = document.getElementById("H");
var E_element = document.getElementById("E");

//setup
var headerDiv, menuDiv; 
var serial;
var menuPos = -100;

//model info
var layer1Z = 0.450;
var layerHeight = 0.5;
var pointsPerCircle = 60;
var circleRadius = 30;
var modelHeight = 60;
var bedCenterX = 110, bedCenterY = 110;

//running display
var canvas;
var canvasPos = 200;
var printerRunning = false;
var sendingCommands = false;
var currentLine = "foobar";
var latestData = "waiting for data";

var waitingOnTemperature = false;

//nozzel location
var n_x, n_y, n_z = layer1Z;
var currentRotation=0;//interger out of circleRadius
var currRotTrigConst;// TWO_PI / pointsPerCircle

var nextCommandTimemark;

var NOZZLE_TEMP = 45;
var BED_TEMP = 45;
//remove later
var TEMP_ConstFeedRate = 1000;//mm/min

var waitingOnPosition = false;//M114
const CLOSE_ENOUGH_POSITION = 0.5;//half a mm 

function setup() {
  //createCanvas(700, 700);

  window_length = 100;
  filter_length = 10;
  volume_window = new Queue();
  volume_window.enqueue(0);

  // Create an Audio input
  mic = new p5.AudioIn();

  r = theta = H = E = 0;

  nozzle_width = 0.1;
  s_f = 0.1;
  l_r = 0.1;
  // start the Audio Input.
  // By default, it does not .connect() (to the computer speakers)
  mic.start();
  d = new Date();
  
 //serial
 headerDiv = createDiv('Connect to 3D printer!').size(300); 
 headerDiv.center('horizontal'); 
 headerDiv.style('font-size', '24px'); 
 headerDiv.style('text-align', 'center'); 
 
 menuDiv = createDiv(''); 
 menuDiv.center('horizontal');
 menuDiv.style('text-align', 'left'); 

 serial = new p5.SerialPort();

 serial.list();

 serial.on('connected', serverConnected);
 serial.on('list', gotList);
 serial.on('data', gotData);
 serial.on('error', gotError);
 serial.on('open', gotOpen);
 serial.on('close', gotClose);
 
}


function serverConnected() {
 print("Connected to Server");
}

function gotList(thelist) {
	
  menuDiv.remove();	
  menuDiv = createDiv(''); 
  menuDiv.center('horizontal');
  menuDiv.style('text-align', 'left'); 
		
  //port drop down
  portListDropDown = createSelect();  
  title = createElement('option', 'Choose a port:');
  
  portListDropDown.child(title);
  portListDropDown.position(menuPos, 75);
  portListDropDown.parent(menuDiv);
  
  for (let i = 0; i < thelist.length; i++) {
    thisOption = createElement('option', thelist[i]);
    thisOption.value = thelist[i];
    portListDropDown.child(thisOption);
    print(i + " " + thelist[i]);
  }
  
  //port baud rate entry field
  baudRateTextBox = createInput('115200');
  baudRateTextBox.position(menuPos, 100);
  baudRateTextBox.attribute('type', 'number');
  baudRateTextBox.parent(menuDiv);
  
  //connect to this button
  connectButton = createButton('Connect!');
  connectButton.position(baudRateTextBox.x + baudRateTextBox.width + 5, baudRateTextBox.y);
  connectButton.mousePressed(openPort);
  connectButton.parent(menuDiv);
  
  inputText = createElement('p', 'Port and baud rate...');
  inputText.position(menuPos, 35);
  inputText.size(500,10);
  inputText.parent(menuDiv);
}

function gotOpen() {
 print("Serial Port is Open");
 serial.clear();
}

function gotClose(){
 print("Serial Port is Closed");
}

function gotError(theerror) {
 print(theerror);
}

function gotData() {
 let currentString = serial.readStringUntil('\n');
 trim(currentString);
 if (!currentString) return;
 
 latestData = currentString;
 
 print(latestData);
 
 if(waitingOnTemperature){
	 
	if(latestData.includes("T:") && latestData.includes("B:")){
		let currentNozzleTemp = parseFloat(latestData.substr(latestData.indexOf("T:")+2));
		let currentBedTemp = parseFloat(latestData.substr(latestData.indexOf("B:")+2));
		if(currentNozzleTemp >= NOZZLE_TEMP && currentBedTemp >= BED_TEMP ){
			waitingOnTemperature = false;
			
			print("Preheated");
		}
	}
 }else if(waitingOnPosition){

	if(latestData.includes("X:") && latestData.includes("Y:") && latestData.includes("Z:")){
		let currX = parseFloat(latestData.substr(latestData.indexOf("X:")+2));
		let currY = parseFloat(latestData.substr(latestData.indexOf("Y:")+2));
		let currZ = parseFloat(latestData.substr(latestData.indexOf("Z:")+2));
				
		let v1 = createVector(n_x,n_y,n_z);
		let v2 = createVector(currX,currY,currZ);
				
		if(p5.Vector.dist(v1, v2) <= CLOSE_ENOUGH_POSITION){
			waitingOnPosition = false;
			
			print("Positioned");
			beginPrint();
		}
	}
 }
 
}

function openPort() {
  print(baudRateTextBox.value());
  serial.open(portListDropDown.elt.value, JSON.parse('{"baudRate":' + baudRateTextBox.value() + '}'));
  
  headerDiv.html('Connected, press to preheat.').size(300);
  
  menuDiv.remove();
  menuDiv = createDiv(''); 
  menuDiv.center('horizontal'); 
  menuDiv.style('text-align', 'left');

  //print opptions input
  zHeightText = createElement('p', 'First Z:')
  zHeightText.parent(menuDiv);
  zHeightText.position(menuPos, 35);

  zHeightInput = createInput(layer1Z);
  zHeightInput.position(menuPos, 75);
  zHeightInput.attribute('type', 'number');
  zHeightInput.parent(menuDiv);
  
  layerHeightText = createElement('p', 'Layer height:')
  layerHeightText.parent(menuDiv);
  layerHeightText.position(menuPos, 90);
  
  layerHeightInput = createInput(layerHeight);
  layerHeightInput.position(menuPos, 125);
  layerHeightInput.attribute('type', 'number');
  layerHeightInput.parent(menuDiv);

  pointCountText = createElement('p', 'Points per circle:')
  pointCountText.parent(menuDiv);
  pointCountText.position(menuPos, 140);
  pointCountText.size(500, 20);
  
  pointCountInput = createInput(pointsPerCircle);
  pointCountInput.position(menuPos, 175);
  pointCountInput.attribute('type', 'number');
  pointCountInput.parent(menuDiv);
  
  radiusText = createElement('p', 'Circle radius:')
  radiusText.parent(menuDiv);
  radiusText.position(menuPos, 190);
  
  radiusInput = createInput(circleRadius);
  radiusInput.position(menuPos, 225);
  radiusInput.attribute('type', 'number');
  radiusInput.parent(menuDiv);
  
  modelHeightText = createElement('p', 'Model height:')
  modelHeightText.parent(menuDiv);
  modelHeightText.position(menuPos, 240);
  
  modelHeightInput = createInput(modelHeight);
  modelHeightInput.position(menuPos, 275);
  modelHeightInput.attribute('type', 'number');
  modelHeightInput.parent(menuDiv);
  
  centerText = createElement('p', 'Bed center (x, y):')
  centerText.parent(menuDiv);
  centerText.position(menuPos, 290);
  centerText.size(500, 20);
  
  centerXInput = createInput(bedCenterX);
  centerXInput.position(menuPos, 330);
  centerXInput.size(50, centerXInput.height);
  centerXInput.attribute('type', 'number');
  centerXInput.parent(menuDiv);
  centerYInput = createInput(bedCenterY);
  centerYInput.position(menuPos + centerXInput.width+10, centerXInput.y);
  centerYInput.size(50, centerYInput.height);
  centerYInput.attribute('type', 'number');
  centerYInput.parent(menuDiv);
  
  preheatButton = createButton('Preheat!');
  preheatButton.center();
  preheatButton.position(menuPos, 375);
  preheatButton.mousePressed(preheat);
  preheatButton.parent(menuDiv);
}

function preheat(){
	
	layerHeight = parseFloat(zHeightInput.value());
	pointsPerCircle = parseFloat(pointCountInput.value());
	circleRadius = parseFloat(radiusInput.value());
	modelHeight = parseFloat(modelHeightInput.value());
	bedCenterX = parseFloat(centerXInput.value());
	bedCenterY = parseFloat(centerYInput.value());
	
    headerDiv.html('Your printer is running...');
	
	menuDiv.remove();
	menuDiv = createDiv(''); 
    menuDiv.center('horizontal'); 
    menuDiv.style('text-align', 'left');

  blurp = createElement('p', 'The print will begin once you are preheated and the header is in place.')
  blurp.size(500, 20);
  blurp.parent(menuDiv);
  blurp.position(menuPos-20, 35);
  
  canvas = createCanvas(700, 700);
  canvas.parent(menuDiv);
  canvas.position(-canvas.width/2,canvasPos);
  printerRunning = true;
  currentLine = "Current gcode goes here...";
  
	//zero axis
	currentLine = 'G90' + String.fromCharCode(13);//absolute coordinates
	serial.write(currentLine);
	currentLine = 'G21' + String.fromCharCode(13);//units are mm and mm/min
	serial.write(currentLine);
	currentLine = 'G28' + String.fromCharCode(13);//home axis
	serial.write(currentLine);
	
	//preheat
	currentLine = 'M104 S' + NOZZLE_TEMP + ' T0' + String.fromCharCode(13);
	serial.write(currentLine);
	currentLine = 'M140 S' + NOZZLE_TEMP + String.fromCharCode(13);
	serial.write(currentLine);
		
	//nozzle to first location
	currRotTrigConst = TWO_PI/pointsPerCircle;
	
	n_x = bedCenterX + cos(currRotTrigConst*currentRotation) * circleRadius;
	n_y = bedCenterY + sin(currRotTrigConst*currentRotation) * circleRadius;
	n_z = layer1Z;
	
	currentLine = 'G1 X' + n_x + ' Y' + n_y + ' Z' + n_z + ' F' + TEMP_ConstFeedRate + String.fromCharCode(13);
	serial.write(currentLine);	
	
	waitingOnTemperature = true;//tells the program to continously check temperature data
	waitingOnPosition = true;//after the temperature is right it will check for location data...
	
	nextCommandTimemark = millis()+10000;
}

function beginPrint(){
	
	if(sendingCommands == false){
		blurp.remove();
		//begin streaming commands
		sendingCommands = true;
	}
	
	currentRotation = 1;
	sendCirclePrintCommand();
	nextCommandTimemark = millis();//make it so the commands will be one ahead so head movement is smooth
}

function draw() {
	if(printerRunning){
	  background(200);
	  scaling = slider.value;
	  fill(127);
	  stroke(0);

	  var sum_window = 0;
	  var window_list = volume_window.list();
	  // // Get average
	  // for(let i = 0; i < window_list.length - 1; i++) {
	  //   sum_window += window_list[i];
	  // }
	  // sum_window += mic.getLevel();
	  // let avg_window = sum_window / volume_window.size();
	  // 1 1 1 1.2 1 1 1 1 1 
	  volume_window.enqueue(mic.getLevel());
	  if(volume_window.size() > window_length) {
		volume_window.dequeue();
	  }
	  var convolved = []

	  var volume_window_list = volume_window.list();
	  for(let i = 0; i < volume_window_list.length; i++) {
		let sum = 0.0;
		let count = 0;
		for(let j = -1 * filter_length / 2; j < filter_length / 2; j++) {
		  if(j >= 0 && j < volume_window_list.length) {
			sum += volume_window_list[i];
			count += 1;
		  }
		}
		convolved.push(sum/count);
	  }

	  var window_list = volume_window.list();
	  for(let i =0; i < window_list.length; i++){
		let x = i * (width / (window_list.length-1));
		// let y = map(window_list[i], 0, 1, 0, sum_window);
		y = window_list[i] * 10000;
		// console.log(window_list);
		ellipse(x, y, 7);
	  }

	  for (let i = 0; i < convolved.length; i++) {
		let x = map(i, 0, convolved.length, 0, width);
		let h = -height + map(convolved[i], 0, 0.05, height, 0);
		// console.log(convolved);
		rect(x, height, width / convolved.length, h);
	  }

	  r = map(convolved[convolved.length - 1], 0, 0.1, 0, 1);
	  theta = map(convolved[convolved.length - 1], 0, 0.1, 0, 90);
	  H = r * cos(radians(theta));
	  E = r * sin(radians(theta)) * (nozzle_width / s_f) * l_r; 

		
	  r_element.innerHTML = r.toString();
	  theta_element.innerHTML = theta.toString();
	  H_element.innerHTML = H.toString();
	  E_element.innerHTML = E.toString();
	  
	  textSize(48);
	  text(currentLine, 20, 60);
	  
	  if(waitingOnTemperature){
		if(nextCommandTimemark <= millis()){
			currentLine = 'M105' + String.fromCharCode(13);
			serial.write(currentLine);
			nextCommandTimemark = millis() + 1000;
		}
	  }
	  if(waitingOnPosition){
		if(nextCommandTimemark <= millis()){
			currentLine = 'M114' + String.fromCharCode(13);
			serial.write(currentLine);
			nextCommandTimemark = millis() + 1000;
		}
	  }
	  else if(sendingCommands && nextCommandTimemark <= millis()){
			sendCirclePrintCommand();
	  }
	}
}

function sendCirclePrintCommand(){
	let t_x = n_x, t_y = n_y;
	
	n_x = bedCenterX + cos(currRotTrigConst*currentRotation) * circleRadius;
	n_y = bedCenterY + sin(currRotTrigConst*currentRotation) * circleRadius;
	
	let distance = dist(t_x, t_y, n_x, n_y);
	
	currentLine = 'G1 X' + n_x + ' Y' + n_y + String.fromCharCode(13);//todo add extrution
	serial.write(currentLine);
	
	nextCommandTimemark = millis() + (distance/TEMP_ConstFeedRate)*60000;
	currentRotation++;
	
	if(currentRotation >=60){
		currentRotation = 0;
		
		n_z += layerHeight;
		
		if(n_z >= modelHeight){
			//finished
			
			//end execution
		}
		
		currentLine = 'G1 Z' + n_z + String.fromCharCode(13);
		serial.write(currentLine);
		
		nextCommandTimemark = millis() + (layerHeight/TEMP_ConstFeedRate)*60000 + 500;
		
		waitingOnPosition = true;//make it so it synchronizes every circle whereas the pritner is sure not to get too far off.
	}
}

function mousePressed() {
    userStartAudio();
}

slider.oninput = function() {
    scaling = this.value;
    console.log(scaling);
}

function Queue() {
  this.qList = [];
  this.head = -1;
  this.tail = -1;
  
  this.enqueue = function(item) {
    if (this.head == -1) {
      this.head++;
    }
    this.tail++;
    this.qList.push(item);
  };
  
  this.dequeue = function() {
    if (this.head == -1) {
      console.log("Queue underflow!");
    } else if (this.head == this.tail) {
      const p = this.qList.splice(0, 1);
      this.head--;
      this.tail--;
      return p;
    } else {
      this.tail--;
      return this.qList.splice(0, 1);
    }
  };
  
  this.size = function() {
    return this.qList.length;
  };
  
  this.peek = function() {
    if (this.head == -1) {
      console.log("Queue is empty!");
    } else {
      return this.qList[this.head];
    }
  };
  
  this.list = function() {
    return this.qList;
  };
}
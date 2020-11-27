//mic input control
var mic;

//*mutatable by user
var micMaxVolRemap=0.35;//normaly the mic charts volume from 0 to 1.0, but it rarely gets even close to that so we should give it more range by boosting

//setup
var headerDiv, menuDiv; 
var serial;
var menuPos = -100;

//model info

//*not sure
var layer1Z = 1.0;
var layerHeight = 0.85;

var pointsPerCircle = 60;
var circleRadius = 12.5;

//*mutatable by user
var modelHeight = 120;
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

var NOZZLE_TEMP = 190;
var BED_TEMP = 50;
var ConstFeedRate = 300;//mm/min

var waitingOnPosition = false;//if true this program will regularly send 'M114' to the printer to report position until its position matches what it expects
var CLOSE_ENOUGH_POSITION = 2;//2 mm 

//Extrusion per mm by mic Implmentation
var minExtrusionPerMM = 0.15;
var maxExtrusionPerMM = 0.65;

var minRadiusScaleFactor=0.825;
var maxRadiusScaleFactor=1.175;

var runningMicSampleTotal=0.0;
var runningMicSampleCount=0.0;
var recentAverages;

var layersPerOscilation = 12;

//todo, add scaling from the previous work

function setup() {

  // Create an Audio input
  mic = new p5.AudioIn();

  // start the Audio Input.
  // By default, it does not .connect() (to the computer speakers)
  mic.start();
  
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
  
  recentAverages = new QueueCapped();
  recentAverages.enqueue(0);
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
 
 //print(latestData);
 
 if(waitingOnTemperature){
	 
	if(latestData.includes("T:") && latestData.includes("B:")){
		let currentNozzleTemp = parseFloat(latestData.substr(latestData.indexOf("T:")+2));
		let currentBedTemp = parseFloat(latestData.substr(latestData.indexOf("B:")+2));
		if(currentNozzleTemp >= NOZZLE_TEMP && currentBedTemp >= BED_TEMP ){
			waitingOnTemperature = false;
			
			//print("Preheated");
			
			//first pos
			currentLine = 'G0 X' + n_x + ' Y' + n_y + ' Z' + n_z + ' F1000' + String.fromCharCode(13);
			serial.write(currentLine);	
			//feedrate
			currentLine = 'G1 F' + ConstFeedRate + String.fromCharCode(13);
			serial.write(currentLine);	
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
			
			//print("Positioned");
			beginCircle();
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
	
	layer1Z = parseFloat(zHeightInput.value());
	layerHeight = parseFloat(layerHeightInput.value());
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
	currentLine = 'M83' + String.fromCharCode(13);//realative for e only
	serial.write(currentLine); 
	currentLine = 'G21' + String.fromCharCode(13);//units are mm and mm/min
	serial.write(currentLine);
	currentLine = 'G28' + String.fromCharCode(13);//home axis
	serial.write(currentLine);
	
	currentLine = 'G1 Z'+ (layer1Z*2) + String.fromCharCode(13);
	serial.write(currentLine);
	
	//preheat
	currentLine = 'M104 S' + NOZZLE_TEMP + ' T0' + String.fromCharCode(13);
	serial.write(currentLine);
	currentLine = 'M140 S' + BED_TEMP + String.fromCharCode(13);
	serial.write(currentLine);
		
	//nozzle to first location
	currRotTrigConst = TWO_PI/pointsPerCircle;
	
	n_x = bedCenterX + cos(currRotTrigConst*currentRotation) * circleRadius;
	n_y = bedCenterY + sin(currRotTrigConst*currentRotation) * circleRadius;
	n_z = layer1Z;
	
	waitingOnTemperature = true;//tells the program to continously check temperature data
	waitingOnPosition = true;//after the temperature is right it will check for location data...
	
	nextCommandTimemark = millis()+10000;
}

function beginCircle(){
	
	if(sendingCommands == false){
		blurp.remove();
		//begin streaming commands
		sendingCommands = true;
	}
	
    //currentRotation = 0;

	sendCirclePrintCommand();
	nextCommandTimemark = millis();
	//sending a print command and then immediately allowing another makes it so the commands will be one ahead which enables the head movement to be smooth
}

function draw() {
	if(printerRunning){
	  background(200);

	  fill(127);
	  stroke(0);

	  let micVolFixed = map(mic.getLevel(), 0, micMaxVolRemap, 0, 1, true);

	  runningMicSampleTotal += micVolFixed;
	  runningMicSampleCount += 1;
	  
	  //draw rectangles showing the running average and current mic sample
	  rect(width/4, height, 25, -map(micVolFixed, 0, 1, 0, height));
	  rect(width/2, height, 25, -map(runningMicSampleTotal/runningMicSampleCount, 0, 1, 0, height));
	  rect(3*width/4, height, 25, -map(recentAverages.average(), 0, 1, 0, height));

	  
	  textSize(12);
	  text(currentLine, 20, 60);
	  
	  if(waitingOnTemperature){
		if(nextCommandTimemark <= millis()){
			currentLine = 'M105' + String.fromCharCode(13);
			serial.write(currentLine);
			nextCommandTimemark = millis() + 1000;
			
			runningMicSampleTotal = runningMicSampleCount = 0;
		}
	  }
	  if(waitingOnPosition){
		if(nextCommandTimemark <= millis()){
			currentLine = 'M114' + String.fromCharCode(13);
			serial.write(currentLine);
			nextCommandTimemark = millis();// + 100;
		}
	  }
	  else if(sendingCommands && nextCommandTimemark <= millis()){
			sendCirclePrintCommand();
	  }
	}
}

function sendCirclePrintCommand(){
	
	let E = 0;
	let thisSampleAverage = 0;

	if(runningMicSampleCount !=0)
		thisSampleAverage = (runningMicSampleTotal/runningMicSampleCount);
		//note: (runningMicSampleTotal/runningMicSampleCount) is between 0 and 1	
	
	recentAverages.enqueue(thisSampleAverage);
	
	n_z += layerHeight/pointsPerCircle;
	n_z = round(n_z,3);

	let t_x = n_x, t_y = n_y;
	
	let currRad = currRotTrigConst*currentRotation;
	let variance = recentAverages.variance();
	let temp1 = (variance!=0 ? (recentAverages.average() - thisSampleAverage)/recentAverages.variance() : 0);
	let temp2 = cos(currRad - (n_z/(layerHeight*layersPerOscilation))*pointsPerCircle*currRotTrigConst);
	let scaleRotHelper = (temp1 >= 0 ? 1 : -1)*map(abs(temp1), 0, 1, 0, temp2, true);
	//arbitartily defined method of determining varying the radius
	
	let xScale = map(scaleRotHelper, -1, 1, minRadiusScaleFactor, maxRadiusScaleFactor, true);
	let yScale = map(scaleRotHelper, -1, 1, maxRadiusScaleFactor, minRadiusScaleFactor, true);

	n_x = round(bedCenterX + cos(currRad) * circleRadius * xScale, 3);
	n_y = round(bedCenterY + sin(currRad) * circleRadius * yScale, 3);
	
	let distance = dist(t_x, t_y, n_x, n_y);
	
	if(runningMicSampleCount != 0)
		E = round(distance * map(thisSampleAverage, 0, 1, minExtrusionPerMM, maxExtrusionPerMM), 3);//less extrusion at low noise
		//E = round(distance * map(thisSampleAverage, 1, 0, minExtrusionPerMM, maxExtrusionPerMM), 3);//less at high noise
	
	runningMicSampleTotal = runningMicSampleCount = 0;
	
	currentLine = 'G1 X' + n_x + ' Y' + n_y + ' Z' + n_z + ' E' + E + String.fromCharCode(13);

	serial.write(currentLine);
	//print(currentLine);
	
	nextCommandTimemark = millis() + (distance/ConstFeedRate)*60000;
	currentRotation++;
	
	if(currentRotation % ((pointsPerCircle*(5.0/3.0)) | 0) == 0){
		//currentRotation = 0;
		//n_z += layerHeight;
		//currentLine = 'G1 X' + n_x + ' Y' + n_y + ' Z' + n_z + String.fromCharCode(13);
		//serial.write(currentLine);
		
		//nextCommandTimemark = millis() + (layerHeight/ConstFeedRate)*60000;
		
		waitingOnPosition = true;//make it so it synchronizes every circle whereas the pritner is sure not to get too far off.
	}
	
	if(n_z >= modelHeight){
	  //finished
	  console.log("Model Finished");
  
		shutOff();
		return;
		//end execution
	}
}

function shutOff(){
	
	currentLine = 'M104 S0' + String.fromCharCode(13);//turn off extruder
	serial.write(currentLine);
	currentLine = 'M140 S0' + String.fromCharCode(13);//turn off bed
	serial.write(currentLine);
	currentLine = 'M84 S0' + String.fromCharCode(13);//disable motors
	serial.write(currentLine);
	
	sendingCommands = false;
	printerRunning = false;
	
}

function mousePressed() {
    userStartAudio();
}

function QueueCapped() {
  this.qList = [];
  this.head = -1;
  this.tail = -1;
  this.capacity = 30;
  
  this.enqueue = function(item) {
    if (this.head == -1) {
      this.head++;
    }
    this.tail++;
    this.qList.push(item);
	
	if(this.capacity < this.qList.length) this.dequeue();
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
  
  this.average = function() {
	if(this.size == 0) return 0;
	
	let result = 0;
	for(let i =0; i < this.qList.length; i++){
		result += this.qList[i];
	}
	
	return result / this.qList.length;
	
  }
  
  this.variance = function() {
	if(this.size == 0) return 0;
	
	let result = 0;
	let average = this.average();
	for(let i =0; i < this.qList.length; i++){
		result += pow((this.qList[i] - average), 2);
	}
	
	result = result / this.qList.length;
	
	return result <= 0.0005 ? 0 : result;
	
  }
}

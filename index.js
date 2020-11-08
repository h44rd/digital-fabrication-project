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
let headerDiv, menuDiv; 
let serial;
let menuPos = -100;

//model info
let layer1Z = 0.450;
let layerHeight = 0.5;
let pointsPerCircle = 60;
let circleRadius = 30;
let modelHeight = 60;
let bedCenterX = 110, bedCenterY = 110;

//running display
let canvas;
let canvasPos = 200;
let sendingCommands = false;
let currentLine = "foobar";
let latestData = "waiting for data";


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
 let currentString = serial.readLine();
  trim(currentString);
 if (!currentString) return;
 
 latestData = currentString;
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
	
	layerHeight = zHeightInput.value();
	pointsPerCircle = pointCountInput.value();
	circleRadius = radiusInput.value();
	modelHeight = modelHeightInput.value();
	bedCenterX = centerXInput.value();
	bedCenterY = centerYInput.value();
	
    headerDiv.html('Your printer is running...');
	
	menuDiv.remove();
	menuDiv = createDiv(''); 
    menuDiv.center('horizontal'); 
    menuDiv.style('text-align', 'left');

  blurp = createElement('p', 'Wait until preheated then press continue.')
  blurp.size(500, 20);
  blurp.parent(menuDiv);
  blurp.position(menuPos-20, 35);

  startButton = createButton('Begin print!');
  startButton.center();
  startButton.size(100, 50);
  startButton.position(-startButton.width/2, 100);
  startButton.mousePressed(beginPrint);
  startButton.parent(menuDiv);
  
  canvas = createCanvas(700, 700);
  canvas.parent(menuDiv);
  canvas.position(-canvas.width/2,canvasPos);
  sendingCommands = true;
  currentLine = "Current gcode goes here...";
  
//gcode header, ei zero axis and preheat

	//stringToWrite = 'G91' + String.fromCharCode(13);
	//serial.write(stringToWrite);

}

function beginPrint(){
	//begin streaming commands
	//calculate time to wait until sending next command by considering feed rate (mm/min) and distance (note that p5 has a 2d distance function)
}

function draw() {
	if(sendingCommands){
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
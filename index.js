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

function setup() {
  createCanvas(700, 700);

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
}

function draw() {
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
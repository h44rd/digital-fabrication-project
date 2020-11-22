# Sani Inc. Project Documentation

Nozzle temperature: 200 
Bed temperature: 60

### Iteration 0

TODO: Add pictures of the failed print.

Debug errors:
* Visualization created
* Averaging of the audio
* Fixing bugs in computing the H and E values.
  * Computing the length of each segement
  * Area of crossection

### Iteration 1
* r = 5.0
* layer1Z = 0.45
* window_length = 1000
* layerHeight = 0.5
* modelHeigth = 60
* Audio = Raindrops

A cylinder with no noise

### Iteration 2
* r = 5.0
* layer1Z = 0.45
* window_length = 1000
* layerHeight = 0.5
* modelHeigth = 60
* Audio =  Hockey Monkey by the zambonis

The nozzle hit the bed
Error:
The mapping of H and E was wrong. (cosine becoming negative -> H was becoming negative, `map` function was not clamping if the value went out of bounds.)

### Iteration 3
#### Trying constant values for E and H
* E: 0.8
* Z: 2 
* TODO: Add pictures

* E: 0.2
* Z: 2
* Zig-zag and coil noise found

* E: 0.2
* Z: 1
* Entire model completed 
* TODO: Add picture

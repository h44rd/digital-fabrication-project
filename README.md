# Sani Inc. Project Documentation

## Project Description
In this project, our aim is to create the physicalization of audio into 3D printed objects. We map the audio input received by the microphone to 3D printer parameters in a G-code statement. The updated G-code statements are fed to the 3D printer in real time, and it is determined using the audio input that the time.

## Libraries and Tools used
* [P5.js](https://p5js.org/)
* [HFI Controller](https://github.com/qubick/HFI-controller)
* [P5 Serial Control](https://github.com/p5-serial/p5.serialcontrol)

## Theory
To map the audio noise to 3D noise, we needed a function that maps the audio intensity at a given time to the G-code parameters `(X, Y, Z, E, etc)`. We referred to the [*Expressive Fused Deposition Modeling by Controlling Extruder Height and Extrusion Amount*](https://haruki.xyz/pdf/efdm_preprint.pdf) paper for the various types of noise that can be introduced into the 3D printed model by manipulating just the `Z` and `E` (extrusion) values. We have also attempted to create our own mapping function which adds noise by changing the `X` and `Y` values based on the audio input.

## Progress

We used the *Ender 3 Pro* printer for the purposes of our project.

### Iteration 0

In this iteration, our aim was to have the basic functionality implemented and have the audio influenced G-code sent to the 3D printer. We observed that there was no noise generated in the print. Here, the audio intensity was sampled every 5 seconds and used to generate the G-code statement.

![The cylinder is textured but the 3D noise is not as expected.](./img/1.jpg)
The cylinder is textured but the 3D noise is not as expected.
![](./img/2.jpg)
Errors in printing.
![](./img/3.jpg)
Cyclinder printed is not upright.
![](./img/4.jpg)
We did get a noise pattern but the cylinder was not being printed as required.

Based on our observations of the printed results, we made the following changes:
* Averaging of the audio: To create a smoother transition, average the audio intensity received in a time window and then determine the G-code command based on the averaged value.
* Fixing bugs in computing the H and E values.
  * Computing the length of each segement
  * Area of crossection taken into account

### Iteration 1
Once we had the basic functionality working, and a cylinder being printed, we observed that the 3D printed noise was still not significant.

We decided to keep `r` constant, and vary only `theta` in the method proposed by the paper cited.

Parameters used:
* r = 5.0
* layer1Z = 0.45
* window_length = 1000
* layerHeight = 0.5
* modelHeigth = 60
* Audio = Raindrops

Result: A cylinder with no noise.

### Iteration 2
* r = 5.0
* layer1Z = 0.45
* window_length = 1000
* layerHeight = 0.5
* modelHeigth = 60
* Audio =  Hockey Monkey by the zambonis

The nozzle hit the bed.

Error: The mapping of `Z` and `E` was wrong. We noticed the map function was not clamping, and the value of H and E was going out of bounds. We fixed this error and continued our search for bettern parameters.

### Iteration 3

We observed that no noticeable noise pattern was being formed after various paprameters were used, we tried to fix the `Z` and `E` values to see if the results in the paper were reproducible. 

Constant values used:
* E: 0.8
* Z: 2 

Result: No significant noise. 

* E: 0.2
* Z: 2

Result: Zig-zag and coil noise found

* E: 0.2
* Z: 1

Result: Entire model completed 
* Coiling and zig-zag noise found.

![](./img/5.jpg)
![](./img/6.jpg)
![](./img/7.jpg)
![](./img/8.jpg)
![](./img/9.jpg)

The noise in the model was noticeable and significant, but mapping audio noise to 3D noise was not working.

### Iteration 4
We created our own mapping from audio noise to the 3D noise by manipulating the `X` and `Y` values in the G-code command. 

Basic methodology: Change the point on the layer by a small magnitude based on the audio noise and along the radius.

This was a substitute for the method proposed by the paper.

* Noise range: 2 mm 
* Points per circle: 300

![](./img/14.jpg)

#### Reducing the points per circle
* Noise range: 2 mm
* Points per circle: 10

![](./img/15.jpg)
![](./img/16.jpg)
Here, we observe that the layers were printed based on the audio noise as the magnitude of the offset was based on the audio.

### Final Implementation

Our final implementation satisfies the following requirements for the audio physicalization:
* Printed output being does not need to be tracked in order to determine future header movements.
* Print clearly recovers from disruption.
* Changes in data are clearly visible in the model.

The audio intensity controls the extrusion rate. It linearly interpolates between high and low extrusion based the audio.

The procedural method for drawing the model is *slightly* changed from the original and it is based on the current sample's difference from the recent smaple's average.

<!-- ![](./img/22.jpg) -->
![](./img/23.jpg)
Left two: no noise

Right two: classic rock

1st/3rd: high noise for high extrusion

2nd/4th: low noise for high extrusion

The option is given due to the fact that the sound input can be taken in different context. For instance, the desired output may differ for audio input in a library versus a concert.

![](./img/24.jpg)
![](./img/26.jpg)

### Current Interface
![](./img/30.png)
![](./img/31.png)
![](./img/32.png)

### Future ideas
* To consider the previous point as well as the point below for noise calculation.
* Changing extrusion amount based on audio noise and see if it gives good results.
* Need to find the best set of mapping parameters from audio noise to 3D print noise.

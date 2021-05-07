import clock from "clock";
import document from "document";
import { me as device } from "device";
import * as messaging from "messaging";
import * as fs from "fs";

//For proper fitbit spacing
if (!device.screen) device.screen = { width: 348, height: 250 };

// Update the clock every second
clock.granularity = "seconds";

// Force the first tick to update hour and 
//  minute positiions when the app starts
let last_min = -1;

// Define relevant elements
let minutes_group = document.getElementById('minutes_group');
let hours_group = document.getElementById('hours_group');
let seconds = document.getElementById("seconds");
let stats_animation = document.getElementById("stats_animation");

// Define Constants
const SETTINGS_TYPE = "cbor";
const SETTINGS_FILE = "settings.cbor";
const hourRadius = device.screen.width * .70;
const minuteRadius = device.screen.width * .53;
const statsRadius = device.screen.width * .48;

//Load and initialize Settings
function loadSettings() {
  try {
    return fs.readFileSync(SETTINGS_FILE, SETTINGS_TYPE);
  } catch (ex) {
    return {};
  }
}

let settings = loadSettings();
if (settings.length != 3) {
  settings = [
    {key: "indicator.color", val: "red"},
    {key: "indicator.seconds", val: true},
    {key: "hour.fixed", val: true}
  ]
};


let getMinSecX = (val,radius) => radius * Math.cos(Math.PI * val / 30 + .98*Math.PI);
let getMinSecY = (val,radius) => radius * Math.sin(Math.PI * val / 30 + .98*Math.PI);

let getHourX = (hour,radius) => radius * Math.cos(Math.PI * hour / 6 + .98*Math.PI);
let getHourY = (hour,radius) => radius * Math.sin(Math.PI * hour / 6 + .98*Math.PI);

function updateClock(evt) {
  //for testing
  //let today = new Date(2020, 3, 3, 2, 15, 0);
  let today = evt.date;
  let secs = today.getSeconds();
  let mins = today.getMinutes();
  let hours = today.getHours() % 12;

  if (mins != last_min ) {
    for (let ind = 0; ind < 12; ind += 1){
      minutes_group.children[ind].x = getMinSecX(ind*5 - mins, minuteRadius);
      minutes_group.children[ind].y = getMinSecY(ind*5 - mins, minuteRadius);

      let extraDegreesIfHoursNotFixed = settings[2].val ? 0 : mins/60;
      hours_group.children[ind].x = getHourX(ind - hours - extraDegreesIfHoursNotFixed,
                                             hourRadius);
      hours_group.children[ind].y = getHourY(ind - hours - extraDegreesIfHoursNotFixed,
                                             hourRadius);
    }
  }

  if (settings[1].val) {
    seconds.text = secs < 10 ? '0' + secs : secs;
  }
}

var isiton = false;
function onTap(evt) {

  if (!isiton){
    stats_animation.animate("enable");
  }
  else {
    stats_animation.animate("disable");
  }

  isiton = !isiton;
}

let screen_tap = document.getElementById("screen_tap");
screen_tap.addEventListener("click", onTap);

function updateSettings(evt) {
  //settings values
  //  string  indicator.color
  //  bool    indicator.seconds
  //  bool    hour.fixed

  let key = evt.data.key;
  let val = evt.data.value;

  switch (key) {
    case "indicator.color":
      let indicators = document.getElementsByClassName("colored-line");
      let statsIndicators = document.getElementsByClassName("icon");
      indicators.forEach ( (el) => el.style.fill = val );
      statsIndicators.forEach ( (el) => el.style.fill = val );
      settings[0].val = val;
      break;
    case "indicator.seconds":
      let secondsGroup = document.getElementsByClassName("seconds-prop");
      secondsGroup.forEach ( (el) => el.style.opacity = val ? 1 : 0 );
      settings[1].val = val;
      break;
    case "hour.fixed":
      settings[2].val = val;
      break;
  }

  //Write new settings to file system
  fs.writeFileSync(SETTINGS_FILE, settings, SETTINGS_TYPE);

  //Force UI update
  last_min = -1;
}

// Update the clock every tick event
clock.ontick = (evt) => updateClock(evt);
messaging.peerSocket.onmessage = updateSettings;

//Force an update with all relevant settings
for (let i = 0; i < 3; i++){
  updateSettings( 
     {
      data : { 
        key : settings[i].key,
        value: settings[i].val
      }
    } );
}
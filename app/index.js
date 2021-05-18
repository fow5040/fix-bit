import clock from "clock";
import document from "document";
import { me as appbit} from "appbit";
import { me as device } from "device";
import { HeartRateSensor } from "heart-rate";
import { today } from "user-activity";
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
let heart_rate = document.getElementById("heartrate_text")
let step_count = document.getElementById("steps_text");
let stats_animation = document.getElementById("stats_animation");

// Define Constants
const SETTINGS_TYPE = "cbor";
const SETTINGS_FILE = "settings.cbor";
const hourRadius = device.screen.width * .70;
const minuteRadius = device.screen.width * .53;
const statsActiveDuration = 4000; //Time stats remain active without further taps

// Create state variable for showing heartrate & step count
let show_stats = false;
// State variable for animation status
// should only be true if the 'leaving' animation is active
let stats_leaving = false;
// Time to check if animation should be disabled
let stats_disable_time = Date.now();

//Load and initialize Settings
function loadSettings() {
  try {
    return fs.readFileSync(SETTINGS_FILE, SETTINGS_TYPE);
  } catch (ex) {
    return {};
  }
}

let settings = loadSettings();
if (settings.length != 4) {
  settings = [
    {key: "indicator.color", val: "red"},
    {key: "indicator.seconds", val: true},
    {key: "hour.fixed", val: true},
    {key: "indicator.stats", val: false}
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

function activityCallback(evt) {
  updateSteps();
}

function updateSteps(){
  let val = (today.adjusted.steps || 0);
  let stepText = "----";
  if (val != 0){
    stepText = val > 999 ? Math.floor(val/1000) + "," + ("00"+(val%1000)).slice(-3) : val;
  }

  step_count.text = stepText;
}

// Function can be called irrespective of state of stats display
function maybe_show_stats(){
  //If stats are on screen, extend animation life, or do nothing
  if (show_stats == true){
    stats_disable_time = Date.now() + statsActiveDuration - 5;
    setTimeout(maybe_disable_stats, statsActiveDuration);
    return;
  }

  //If stats are leaving, reenable them about 400ms after leaving
  if (stats_leaving == true){
    setTimeout(maybe_show_stats, stats_disable_time + 405 - Date.now());
    return;
  }

  //If stats are off screen, trigger animation and disable after active duration
  updateSteps();
  show_stats = true;
  stats_animation.animate("enable");
  stats_disable_time = Date.now() + statsActiveDuration - 5;
  setTimeout(maybe_disable_stats, statsActiveDuration);
}

function maybe_disable_stats(){
  // If always enable flag is true, never disable stat monitor
  if (settings[3].val == true){
    return;
  }

  //Check if stats_disable_time has changed
  if (Date.now() < stats_disable_time){
    return;
  }

  //Check if disable animation is active
  if (stats_leaving){
    return;
  }

  //Set animation flag to active,
  //    stats to inacrtive,
  //    and reset animation flag in 400ms
  stats_leaving = true;
  show_stats = false;
  stats_animation.animate("disable");
  // Disable animation length = 400ms
  setTimeout( () => {
    stats_leaving = false;
  }, 400)

}

function onTap(evt) {
  maybe_show_stats();
}

let screen_tap = document.getElementById("screen_tap");
screen_tap.addEventListener("click", onTap);

function updateSettings(evt) {
  //settings values
  //  string  indicator.color
  //  bool    indicator.seconds
  //  bool    hour.fixed
  //  bool    indicator.stats

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
    case "indicator.stats":
      settings[3].val = val;
      break;
  }

  //Write new settings to file system
  fs.writeFileSync(SETTINGS_FILE, settings, SETTINGS_TYPE);

  //Force UI update
  last_min = -1;
  maybe_show_stats();
}

// Update the clock and stats every tick event
clock.ontick = (evt) => updateClock(evt);
messaging.peerSocket.onmessage = updateSettings;

if (appbit.permissions.granted("access_activity")) {
  clock.addEventListener("tick", activityCallback);
}

//Force an update with all relevant settings
for (let i = 0; i < 4; i++){
  updateSettings( 
     {
      data : { 
        key : settings[i].key,
        value: settings[i].val
      }
    } );
}
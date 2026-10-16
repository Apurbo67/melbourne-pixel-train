// Melbourne Pixel Train - Tuning numbers: speeds, timings, driving physics, clock, particle budgets
'use strict';

// =====================================================================
// 1. CONFIG
// =====================================================================
const W = 320, H = 180;                 // internal resolution

const CONFIG = {
  STEP: 1 / 60,                         // fixed simulation timestep (s)
  MAX_FRAME: 0.25,                      // clamp long frames (tab switches)
  FAST_FACTOR: 4,                       // hold F to fast-forward

  CRUISE_SPEED: 80,                     // world px per second
  ACCEL_TIME: 7,                        // s, 0 -> cruise
  BRAKE_TIME: 6,                        // s, cruise -> 0 (nominal)
  TERRAIN_BLEND: 300,                   // world px over which one landscape fades into the next

  // station stop sequence (seconds)
  SETTLE_TIME: 0.8,                     // brakes settle before doors open
  DOOR_TIME: 0.7,                       // doors slide open / closed
  BOARD_TIMEOUT: 18,                    // safety cap on the boarding phase
  FLAG_TIME: 2.2,                       // platform staff hold up the all clear
  HORN_TIME: 1.0,                       // a toot, then depart

  // DRIVE mode: the player drives with one combined lever, -5 (emergency
  // brake) .. -1 brake steps, 0 coast, 1 .. 8 power notches
  DRIVE: {
    NOTCHES: 8, BRAKES: 4,
    ACCEL: 15, KNEE: 45,                // px/s² at full power; tractive effort fades above KNEE px/s
    DRAG: [0.5, 0.00035],               // rolling + air resistance: c0 + c1 * v²
    BRAKE: 4.5, EMERGENCY: 28,          // px/s² per brake step, emergency brake
    CRANK_TIME: 1.8, SHUTDOWN_TIME: 1.2,            // s for the pantographs to rise, and to drop
    LIMIT: 100, LIMIT_HILLS: 80, LIMIT_BRIDGE: 60, LIMIT_STATION: 60,   // km/h (= px/s)
    COMFORT_ACCEL: 16,                  // px/s² passengers put up with
    FIRST_DEP: 32, DWELL: 16, SLACK: 6, // timetable: s to first departure, per stop, per leg
    SCHED_SPEED: 84,                    // px/s the timetable assumes on open line
    ON_TIME: 8,                         // game minutes either side that count as on time
  },

  // the light follows the trip - a bright afternoon in the city, golden
  // hour through the suburbs, dark at the end of the line - squeezing a
  // whole winter evening into the run; the clock on the driver's desk
  // shows the line's real timetable instead (LINE.clock)
  HOUR_START: LINE.hours[0], HOUR_END: LINE.hours[1],
  CLOCK_START: LINE.clock[0], CLOCK_END: LINE.clock[1],
  HOUR_EASE: 3,                         // max game hours per second when time jumps (skip, T)

  // weather: four seasons in one day - passing showers (seeded, so every trip gets the same ones)
  // (each trip draws a kind of day from WEATHER_DAYS in 19-atmosphere.js;
  // ?seed=N in the address fixes the draw, which the tests rely on)
  LIGHTNING_RATE: 0.03,                 // strikes per second while a storm pours

  TRAIN_FRONT_X: 273,                   // screen x of the headlight
  LOCO_W: 46, CAR_W: 39, CAR_GAP: 2, CAR_COUNT: 5,
  WHEEL_R: 3.5, WHEEL_FRAMES: 6,

  // particle pools [normal, low quality]; nothing is allocated while running
  RAIN_MAX: [180, 100], SPLASH_MAX: [60, 30],
  SPARK_MAX: [70, 36], BIRD_MAX: [14, 8], FLUFF_MAX: [60, 30],
  LOW_QUALITY_MS: 11,                   // average frame cost that switches to low quality
};

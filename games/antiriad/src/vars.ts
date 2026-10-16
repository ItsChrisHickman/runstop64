/**
 * Where the original keeps its state (the port keeps it in the same places, so
 * the two can be compared byte for byte). Names are ours; the original has none.
 */
export const V = {
  // ---- zero page ------------------------------------------------------------------------
  /** Second message/score temporaries the panel uses. */
  warnTimer: 0x38, // 16-bit, $38/$39: the radiation warning's countdown
  hurtCooldown: 0x40, // frames before the hero can be hurt again
  digitRoll: 0x41, // the score digits' roll (7, 5, 3, 1)
  message: 0x54, // the panel's scrolling message: bit 7 = showing, low bits its number
  messagePos: 0x55,
  messageScroll: 0x56,
  panelItem: 0x47, // the item shown in the panel (bit 7: none)
  powerUp: 0x48, // the suit's power-up sequence step (0-6)
  powerUpCount: 0x49,
  d016Panel: 0x4a, // the panel's multicolour bit ($10) as the $B2 interrupt sets it
  d016Play: 0x4b, // the playfield's ($869C: the room's)
  d018Play: 0x4c,
  mc1Play: 0x4d, // the playfield's multicolours ($D022, $D023)
  mc2Play: 0x4e,
  suitEnergy: 0x4f, // 0-$1F
  suitBar: 0x50, // the suit energy bar as drawn
  life: 0x51, // the hero's life out of the suit, 0-$1F
  lifeBar: 0x52, // ... as drawn
  room: 0x5b,
  joystick: 0x64, // the joystick's bits (1 up, 2 down, 4 left, 8 right, $10 fire), set = pushed
  inputDelay: 0x66, // the joystick is read every 7th frame
  frameCount: 0x67, // counted down by the $B2 interrupt (main program delays)
  timer68: 0x68,
  timer69: 0x69,
  roomChange: 0x6b, // bit 7: leaving the room; low 2 bits the way (0 right, 1 left, 2 down, 3 up)
  jumpStep: 0x6c, // index into the jump/fall speed table
  jumping: 0x6d, // bit 7: in the air
  teleport: 0x6e,
  bgCollisions: 0x6f, // sprite-background collisions, as the interrupt latched them
  spriteCollisions: 0x70, // sprite-sprite collisions
  suitRoom: 0x77, // where the suit was left (room, x, y, x's high bits)
  suitX: 0x78,
  suitY: 0x79,
  suitXHigh: 0x7a,
  inSuit: 0x7b, // bit 7: wearing the armour
  shot: 0x7c, // bit 7: a pulsar shot is out
  gameOver: 0x7e,
  fire: 0x7f,
  flySpeedX: 0x80, // in the suit: speed across (0-3)
  flySpeedY: 0x81, // ... and up and down (0-2)
  hover: 0x82, // the suit's hover bob
  hoverTimer: 0x8e,
  panelOn: 0x8a, // bit 7: the panel is active
  irqBusy: 0xab,
  deaths: 0xac,
  titleMode: 0xb0, // bit 7: the title sequence is running
  randomish: 0xb4, // counted up by every pass of the main loop

  // ---- sprite tables (index = sprite 0-7; the hero is sprites 0 and 1) -----------------------
  spriteXY: 0x0200, // shadow of $D000-$D010
  spriteXHigh: 0x0210,
  spriteEnable: 0x0215,
  spriteExpandY: 0x0217,
  spriteColour: 0x0227,
  spriteMulti: 0x021c,
  spriteExpandX: 0x021d,
  anim: 0x0260, // animation number, bit 7 = running
  animDelay: 0x0268,
  animPos: 0x0270,
  frame: 0x0278, // sprite pointer
  hits: 0x0280,
  score: 0x0288,
  dying: 0x0290,
  dyingTimer: 0x0298,
  dyingStep: 0x02a0,
  appearing: 0x02a8,
  appearTimer: 0x02b0,
  appearStep: 0x02b8,
  appearFrame: 0x02c0,
  dir: 0x02c8, // movement: bit 0 up, 1 down, 2 left, 3 right
  movePos: 0x02d0,
  move: 0x02d8, // movement script number, bit 7 = running
  moveCount: 0x02e0,
  moveCmd: 0x02e8,
  speedX: 0x02f0,
  speedY: 0x02f8,
  slowY: 0x0300,
  slowX: 0x0308,

  // ---- sound requests and state (the music driver's) ----------------------------------------
  playing: 0x0355, // per voice: what's playing (bit 7)
  request: 0x035e, // per voice: a sound to start (bit 7)
} as const;

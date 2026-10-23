// What the shell's info sheet says about The Sacred Armour of Antiriad: the credits, the controls and what was changed (shown by games/shell.ts, from the registry's `load`).
// Data only; the game's code is main.ts.

export const info = {
  title: 'The Sacred Armour of Antiriad',
  progress: 'Your progress is saved each time Tal comes into a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/The_Sacred_Armour_of_Antiriad">The Sacred Armour of Antiriad</a> (1986;
    <i>Rad Warrior</i> in the US): after a nuclear war, Tal must find the ancient armour of Antiriad, power it up,
    and destroy the alien oppressors' power centre. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Programming: Stanley Schembri</li>
      <li>Plot, graphics and the comic: Daniel Malone; graphics also
        Stephen Robertson (as <a href="https://www.c64-wiki.com/wiki/Antiriad">C64-Wiki</a> credits him)</li>
      <li>Sound design and music: <a href="https://en.wikipedia.org/wiki/Richard_Joseph">Richard Joseph</a>,
        played by the game's own music driver</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Palace_Software">Palace Software</a>, 1986;
        in the US by <a href="https://en.wikipedia.org/wiki/Epyx">Epyx</a> as <i>Rad Warrior</i> (1988); later by Hi-Tec Software</li>
    </ul>
    <p>Controls: arrows or WASD &middot; out of the armour: left and right walk, down crouches (to pick things up),
    Space (also X, gamepad A) throws a stone, Z or up jumps (with left or right: that way) &middot; in the armour: fly
    with the arrows (once the Gravity Displacer is fitted; Z lifts it too), Space fires the Pulsar Beam (once fitted);
    left or right while standing steps out &middot; P or Esc pauses: a map of the rooms; pick one you can go back to
    (the dark ones you can't, as you are now: in the armour, only rooms it has been in) and press Enter &middot;
    R restarts &middot; C fills the armour from a stored recharge cell (ENHANCED) &middot; M sound on or off &middot; V authentic pixel steps</p>
    <p>ENHANCED (on unless you switch to ORIGINAL with E on the pause screen): unlimited lives and continues, fire and jump on buttons of their own
    (the original has one button, which throws standing still and jumps walking, and up only jumps from standing);
    and an armour out of energy sets down and lets Tal out with left or right, anywhere, to fetch a recharge cell
    (in the original it bounces on the floor until held backwards, and in the first ten rooms never lets him out);
    Tal keeps every recharge cell he picks up (the original carries one) and C fills the armour from one
    (the touch CELL button), stepping into the armour does too; and after the ending, once the game is won, a reward:
    Tal's places from the quest with the credits over them, the parade of the creatures, and THE END (a key skips it;
    W on the pause screen shows it again).
    Hits and kills get effects over the picture in both modes.</p>
    <p>Changes from the original (the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/antiriad/QOL.md">full log</a>):
    pause screen with map and travel &middot; autosave on every room and Continue (coming back carries on where you were; T on the pause screen goes to the title) &middot;
    New Game+ after the ending (the armour yours: unlimited energy, no radiation) &middot; smooth movement at any
    refresh rate &middot; ENHANCED's two buttons, a way out of an empty armour and stored recharge cells.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot; ported from the C64
    original's own code and data</p>
  `,
};

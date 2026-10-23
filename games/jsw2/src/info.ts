// What the shell's info sheet says about Jet Set Willy II: the credits, the controls and what was changed (shown by games/shell.ts, from the registry's `load`).
// Data only; the game's code is main.ts.

export const info = {
  title: 'Jet Set Willy II',
  progress: 'Your progress is saved each time Willy enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Jet_Set_Willy_II">Jet Set Willy II: The Final Frontier</a> (1985): Miner Willy's
    mansion, bigger than ever, from the cellars to the rocket on the roof. Collect every item. All credit belongs to its creators:</p>
    <ul>
      <li><a href="https://en.wikipedia.org/wiki/Jet_Set_Willy">Jet Set Willy</a> created by <a href="https://en.wikipedia.org/wiki/Matthew_Smith_(games_programmer)">Matthew Smith</a></li>
      <li>Jet Set Willy II (ZX Spectrum): Derrick P. Rowson and Steve Wetherill</li>
      <li>Commodore 64 version: John Darnell and Steve Birtles</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Software_Projects">Software Projects</a>, 1985</li>
    </ul>
    <p>This is a translated port, not a rewrite: every routine of the original was translated, instruction for instruction, to
    TypeScript and checked against the original running on an emulated C64, cycle for cycle (the game times
    itself by counting, and draws its screen in raster interrupts).</p>
    <p>Controls: arrows (or WASD) move &middot; Space (or Z, X, pad A) jumps &middot; joysticks and gamepads work &middot;
    P or Esc pauses (with a map) &middot; F3 music on or off &middot; M mutes &middot; in ENHANCED, press jump again in the air for a second jump, and hold Shift (on a phone: RUN) to run</p>
    <p>ENHANCED (on unless you switch to ORIGINAL with E on the pause screen) makes the game a lot easier: jump again in the air
    (once each time you leave the ground, in the direction you hold); ropes take hold of you at once, never drop you, and let you
    jump off from anywhere; your eight lives never run out, and no life is lost for two seconds after coming into a room or losing one;
    a guardian has to overlap you well to kill; sparkles show the items left in the room; a long fall ends in an ordinary landing
    and a death never starts Willy again into the same death; and bed after 160 items earns an ending (a montage of rooms with credits over
    it, the guardians walking through them, THE END; W on the pause screen shows it again once you've won). Hold Shift and Willy runs: his own steps come twice as often (his
    jumps the same jumps, only quicker), while the guardians, ropes and music keep their pace.</p>
    <p>Added for runstop64: progress is saved each time you enter a room (coming back carries on where you were; T on the pause screen goes to the title), and
    after losing you can continue from the last room you entered, with all your lives. The pause screen has a map
    of the whole mansion, lit as you explore it, and travel back to rooms you've been in.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

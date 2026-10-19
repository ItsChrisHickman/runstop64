// What the shell's info sheet says about Thing on a Spring: the credits, the controls and what was changed (shown by games/shell.ts, from the registry's `load`).
// Data only; the game's code is main.ts.

export const info = {
  title: 'Thing on a Spring',
  progress: 'Your progress is saved each time Thing enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Thing_on_a_Spring">Thing on a Spring</a> (1985): guide Thing, bouncing on his
    spring, through the toy factory, find the jigsaw pieces and stop the evil goblin. All credit belongs to its creators:</p>
    <ul>
      <li>Programming: Jason Perkins and Anthony Clarke</li>
      <li>Graphics: Mark Rogers</li>
      <li>Music: <a href="https://en.wikipedia.org/wiki/Rob_Hubbard">Rob Hubbard</a> &mdash; his very first game tune</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>, 1985</li>
    </ul>
    <p>This is a translated port, not a rewrite: every routine of the original was translated, instruction for instruction, to
    TypeScript and checked against the original running on an emulated C64. The game times itself by counting
    (and does much of its work in raster interrupts), so its timing is kept to within a raster line.
    The high-score table and title scroller credit the creators (the only surviving copies had crackers' names in them).</p>
    <p>Controls: arrows (or WASD) move &middot; Space (or Z, X, pad A) for fire &middot; P or Esc pauses (with the map) &middot; 
    joysticks and gamepads work &middot; M mutes</p>
    <p>Added for runstop64: P (or the gear) pauses with a map of the factory: the screens you've been in, the pieces,
    oil cans and switches you've seen, how many pieces you've found, and travel back to any screen you've been in.
    Progress is saved each time you enter a screen (coming back carries on where you were; T on the pause screen goes to the title), and after the oil runs out
    you can continue from the last screen you entered, with full oil.</p>
    <p>ENHANCED (on unless you switch to ORIGINAL with E on the pause screen): steer in the air, a moment's grace for
    a late or early bounce, help onto ledges you just catch, gentler falls, unlimited lives (when the oil runs out you are back at the start of the room with full oil), and sparkles on what moves the game on; and beating the goblin earns an ending once you quit the game's own (a montage of places in the factory with credits over it, a parade of its creatures, THE END; W on the pause screen shows it again once you've won). The full list is in
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/thingonaspring/QOL.md">QOL.md</a>.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

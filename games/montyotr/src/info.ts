// What the shell's info sheet says about Monty on the Run: the credits, the controls and what was changed (shown by games/shell.ts, from the registry's `load`).
// Data only; the game's code is main.ts.

export const info = {
  title: 'Monty on the Run',
  progress: 'Your progress is saved each time Monty enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Monty_on_the_Run">Monty on the Run</a> (1985) is the third game in the
    <a href="https://en.wikipedia.org/wiki/Monty_Mole">Monty Mole</a> series. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Original game: Peter Harrap</li>
      <li>Commodore 64 version: Micro Projects Ltd &mdash; Anthony Clarke and Jason Perkins</li>
      <li>Graphics: Mark Rodgers</li>
      <li>Music: <a href="https://en.wikipedia.org/wiki/Rob_Hubbard">Rob Hubbard</a>, played from his original SID file by his own player code</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>, 1985</li>
    </ul>
    <p>Controls: arrows or WASD move &middot; Space jumps (also Z, X, gamepad A) and starts a game from the title &middot;
    P or Esc pauses: your kit, items found, and a map; pick a room you've visited and press Enter to travel there &middot;
    M music or sound effects &middot; V authentic pixel steps &middot; gamepad Start pauses. On the title, up rolls the
    high scores faster.</p>
    <p>Changes from the original (all in the spirit of the 1985 game; the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/montyotr/QOL.md">full log</a>):
    no freedom kit selection (you carry the right five) &middot; pause screen with map, items and travel &middot;
    Continue after the last life, and after the ending (everything collected kept, to find the rest) &middot; autosave on every room (coming back carries on where you were; T on the pause screen goes to the title) &middot; smooth movement at any refresh rate &middot;
    ENHANCED (switch to ORIGINAL on the title or the pause screen): ride the rising cloud, in the jetpack
    rooms only Monty himself is hit, not his jetpack, and on the C5 street a crash starts the room again and
    holding fire keeps a hop up longer; a death never starts Monty again into the same death; and walking right from the
    start leads into runstop64's own rooms (a dev room, a playground, warp gates to the jetpack and the C5).</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot;
    <a href="https://github.com/Dave-Agent/monty-on-the-run">Dave-Agent's reconstruction</a>, which made reading the
    original possible &middot; music from the <a href="https://www.hvsc.c64.org/">High Voltage SID Collection</a></p>
  `,
};

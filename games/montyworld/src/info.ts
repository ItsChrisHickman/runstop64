// What the shell's info sheet says about Do Svidaniya Monty (shown by games/shell.ts, from the registry's `load`). Data only; the game's code is main.ts.

export const info = {
  title: 'Do Svidaniya Monty',
  progress: 'Your progress is saved each time Monty enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p>Do Svidaniya Monty is a new <a href="https://en.wikipedia.org/wiki/Monty_Mole">Monty Mole</a> game, made in 2026 on the
    engine, tiles, sprites and music of <a href="https://en.wikipedia.org/wiki/Monty_on_the_Run">Monty on the Run</a> (1985), and it
    is still being built: for now three rooms of Moscow, to show the engine runs a second game. Intermole has found Monty on his Greek
    island and Europe is no longer safe; he runs east, out of its reach, the long way round, to Rio. All credit for the game
    it is made on belongs to its creators:</p>
    <ul>
      <li>Monty on the Run, original game: Peter Harrap</li>
      <li>Commodore 64 version: Micro Projects Ltd &mdash; Anthony Clarke and Jason Perkins</li>
      <li>Graphics: Mark Rodgers</li>
      <li>Music: <a href="https://en.wikipedia.org/wiki/Rob_Hubbard">Rob Hubbard</a>, played from his original SID file by his own player code</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>, 1985</li>
      <li>Do Svidaniya Monty: Christopher Hickman with Claude</li>
    </ul>
    <p>Controls: arrows or WASD move &middot; Space jumps (also Z, X, gamepad A) and starts a game from the title &middot;
    P or Esc pauses: items found, and a map; pick a room you've visited and press Enter to travel there &middot;
    M music or sound effects &middot; V authentic pixel steps &middot; gamepad Start pauses.</p>
    <p>Changes from Monty on the Run (the <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/montyworld/QOL.md">full log</a>):
    pause screen with map and travel &middot; autosave on every room &middot; ENHANCED (switch to ORIGINAL on the title or the pause screen):
    unlimited lives and continues, and a death never starts Monty again into the same death.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot; music from the
    <a href="https://www.hvsc.c64.org/">High Voltage SID Collection</a></p>
  `,
};

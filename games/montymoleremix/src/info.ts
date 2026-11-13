// What the shell's info sheet says about Wanted: Monty Mole Remix (shown by games/shell.ts, from the registry's `load`). Data only; the game's code is main.ts.
// Every credit for Wanted has its source in games/montymole/re/credits.md; nobody is added from memory.

export const info = {
  title: 'Wanted: Monty Mole Remix',
  progress: 'Your progress is saved each time Monty enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p>This is <a href="https://en.wikipedia.org/wiki/Wanted:_Monty_Mole">Wanted: Monty Mole</a> (1984, the first Monty Mole game and the first game from
    <a href="https://en.wikipedia.org/wiki/Gremlin_Interactive">Gremlin Graphics</a>) played as <a href="https://en.wikipedia.org/wiki/Monty_on_the_Run">Monty on the Run</a>
    (1985) plays: Wanted's 21 rooms, coal, tools, creatures' paths, gates, crushers and retractable floors, with Monty on the Run's Monty (his walk, his somersault jump, his death),
    its creatures, its look and Rob Hubbard's music. The game and its rooms are the Spectrum game's; Monty and the picture are the Commodore 64 game's. All credit belongs to the makers of both:</p>
    <ul>
      <li>Wanted: Monty Mole: created and programmed by Peter M. Harrap; Monty Mole created by Ian Stewart, Gremlin's director; inlay, cover and poster art by David Bracher; published by Gremlin Graphics Software, 29 July 1984</li>
      <li>Monty on the Run: original game by Peter Harrap; Commodore 64 version by Micro Projects Ltd &mdash; Anthony Clarke and Jason Perkins; graphics by Mark Rodgers; published by Gremlin Graphics, 1985</li>
      <li>Music: <a href="https://en.wikipedia.org/wiki/Rob_Hubbard">Rob Hubbard</a>'s music for Monty on the Run, played from his original SID file by his own player code</li>
    </ul>
    <p>Controls: arrows or WASD move (up and down climb the ropes) &middot; Space jumps (also Z, X, gamepad A) and starts a game from the title &middot;
    Enter continues a saved game from the title &middot; P or Esc pauses: the map of the 21 rooms with the coal taken; pick a room you've come to and press Enter to go to it &middot;
    M music or sound effects &middot; V authentic pixel steps &middot; gamepad Start pauses.</p>
    <p>What it plays like: a game begins outside the miner's house, and the gate on the right stays shut until you have the bucket at the pot; the coal is in the rooms from the start. Coal is what counts (the score is the coal's worth) and four gates open at 16, 32, 48 and 64 pieces; each room's tool kills the creature you touch with it, and is
    lost on leaving the room or dying; crushers come down on the way and the floors draw in and out, as they did. Changes from Wanted (the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/montymoleremix/QOL.md">full log</a>):
    Monty on the Run's Monty and creatures &middot; five lives &middot; a gate opens when its count is reached wherever you are (in Wanted taking the piece elsewhere shut it for good) &middot;
    pause screen with a map, travel, and back to the room's start &middot; autosave on every room and Continue after the last life &middot; a moment's grace after each of those &middot;
    ENHANCED (switch to ORIGINAL on the title or the pause screen): unlimited lives and continues, a death never starts Monty again into the same death, the count of coal to the next gate, and sparkles on the tool, then on the creature it is for; and the show after the ending's verse (also W on the pause screen once you have won).</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot; music from the <a href="https://www.hvsc.c64.org/">High Voltage SID Collection</a></p>
  `,
};

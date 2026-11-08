// What the shell's info sheet says about Wanted: Monty Mole (shown by games/shell.ts, from the registry's `load`). Data only; the game's code is main.ts.
// Every credit has its source in re/credits.md; nobody is added from memory.

export const info = {
  title: 'Wanted: Monty Mole',
  progress: 'Your progress is saved each time Monty enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Wanted:_Monty_Mole">Wanted: Monty Mole</a> (1984) is the first Monty Mole game, and the first game from
    <a href="https://en.wikipedia.org/wiki/Gremlin_Interactive">Gremlin Graphics</a>, for the ZX Spectrum. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Created and programmed by Peter M. Harrap (the title picture carries &ldquo;P.M.HARRAP&rdquo;)</li>
      <li>Monty Mole created by Ian Stewart, Gremlin's director</li>
      <li>Inlay, cover and poster art: David Bracher</li>
      <li>Published by Gremlin Graphics Software, 29 July 1984</li>
      <li>Music: the title tune is an arrangement of <a href="https://en.wikipedia.org/wiki/Colonel_Bogey_March">Colonel Bogey March</a> (Kenneth Alford), and the
        tune when Monty loses a life of <a href="https://en.wikipedia.org/wiki/Abide_with_Me">Abide with Me</a> to William Henry Monk's tune Eventide, both on the Spectrum's beeper</li>
    </ul>
    <p>This is a custom edition of a ZX Spectrum-only game. The 48K game is rebuilt from the original program and checked against it pass for pass, in the Spectrum's own colours, with its
    own beeper sound. ENHANCED removes the colour clash: Monty and the other sprites keep their own colours.</p>
    <p>Controls: arrows or WASD move (up and down climb the ropes) &middot; Space jumps (also Z, X, gamepad A) and starts a game from the title and the options (Enter or a tap too) &middot;
    Enter continues a saved game from the title &middot; P or Esc pauses: the map of the 21 rooms with the coal taken; pick a room you've come to and press Enter to go to it &middot;
    M mutes &middot; V authentic pixel steps &middot; gamepad Start pauses.</p>
    <p>Changes from the original (the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/montymole/QOL.md">full log</a>):
    the key text on the options screen is ours &middot; pause screen with a map of the 21 rooms, the coal taken and travel &middot; autosave on every room and
    Continue after the last life &middot; the high score kept in your browser &middot; a death in the opening scene plays the same rising picture as everywhere (the original freezes there
    for the whole death tune) &middot; ENHANCED (switch to ORIGINAL on the pause screen): unlimited lives, no deaths from falls, no colour clash and smooth movement at any refresh rate.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a></p>
  `,
};

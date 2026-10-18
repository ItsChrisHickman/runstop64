// What the shell's info sheet says about Moley Christmas: the credits, the controls and what was done (shown by games/shell.ts, from the registry's `load`).
// Data only; the game's code is main.ts. The description says the 128K music is added: that is stage 7 (docs/moley-plan.md), being built apart.
// The credits are the original's own credits page (a picture on the tape: concept, program code, graphics, music) plus
// World of Spectrum's list of the people behind it (software id 3243); nobody is added from memory.

export const info = {
  title: 'Moley Christmas',
  progress: 'Your progress is saved each time Monty enters a screen: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Monty_Mole">Moley Christmas</a> (1987) is the free game that came with Your Sinclair,
    a Christmas outing for Monty Mole, for the ZX Spectrum only. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Game concept: Paul Jackson</li>
      <li>Program code: S. Hollingworth and P. Harrap (Shaun Hollingworth and Peter Harrap), with Chris Kerry (credited by World of Spectrum)</li>
      <li>Graphics: P. Harrap</li>
      <li>Music (128K version): <a href="https://en.wikipedia.org/wiki/Ben_Daglish">Ben Daglish</a> (the game's credits page spells it &ldquo;Benn&rdquo;)</li>
      <li>Developed by Teque Software Development for <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>;
        <a href="https://en.wikipedia.org/wiki/Your_Sinclair">Your Sinclair</a> cover game, 1987</li>
    </ul>
    <p>This is a custom edition of a ZX Spectrum-only game. The 48K game is rebuilt from the original program and checked
    against it frame for frame, in the Spectrum's own colours, with the 128K version's music added. ENHANCED removes the
    colour clash: Monty and the other sprites keep their own colours.</p>
    <p>Controls: arrows or WASD move (up and down climb the ropes, and fly in the last screen) &middot; Space jumps (also Z, X, gamepad A) and starts a game from the
    credits page (Enter or a tap too) &middot; any key leaves the Christmas card &middot;
    P or Esc pauses: items taken and a map of the six screens; pick a screen you've come to and press Enter to go to its start &middot;
    M mutes &middot; V authentic pixel steps &middot; gamepad Start pauses.</p>
    <p>Changes from the original (the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/moley/QOL.md">full log</a>):
    the credits page's key text is ours &middot; pause screen with a map of the six screens, items taken and travel &middot; autosave on every screen and
    Continue after the last life (coming back carries on where you were; T on the pause screen goes to the credits page) &middot; the high score kept in your
    browser &middot; ENHANCED (switch to ORIGINAL on the pause screen): no colour clash, smooth movement at any refresh rate, the items left in the pocket
    box, steering in the air, and sparkles on the puzzles and the ways out. Both modes keep the Spectrum's own colours and fix the one place the original jumps to the wrong code (screen 3).</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a></p>
  `,
};

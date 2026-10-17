// What the shell's info sheet says about Moley Christmas: the credits and what was done (shown by games/shell.ts, from the registry's `load`).
// Data only. NOT YET REGISTERED: this text describes the FINISHED build (the Spectrum's colours, the 128K music and the shared
// front end are stages still to come, docs/moley-plan.md). Check every sentence against the game before it goes in games/registry.ts,
// and add the controls and the ORIGINAL / ENHANCED line then.
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
    <p>This is a custom edition of a ZX Spectrum game. The 48K game is rebuilt from the original program and checked against it
    frame for frame, in the Spectrum's own colours, with the 128K version's music, plus the shared front end.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a></p>
  `,
};

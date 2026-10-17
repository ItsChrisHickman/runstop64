// What the shell's info sheet says about Auf Wiedersehen Monty: the credits, the controls and what was changed (shown by games/shell.ts, from the registry's `load`).
// Data only; the game's code is main.ts.

export const info = {
  title: 'Auf Wiedersehen Monty',
  progress: 'Your progress is saved each time Monty enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Auf_Wiedersehen_Monty">Auf Wiedersehen Monty</a> (1987) is the fourth game in the
    <a href="https://en.wikipedia.org/wiki/Monty_Mole">Monty Mole</a> series: Monty is on the run across Europe to the
    Costa Del Cashinhand, and must earn the money for it on the way. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Design and programming: Pete Harrap, Shaun Hollingworth, Chris Kerry, Colin Dooley and Greg Holmes</li>
      <li>Graphics: Steve Kerry and T. Lloyd</li>
      <li>Music: Rob Hubbard and Ben Daglish (&ldquo;Robb and Benn&rdquo;), played by the game's own music and effect drivers</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>, 1987</li>
    </ul>
    <p>Controls: arrows or WASD move (up climbs) &middot; Space jumps (also Z, X, gamepad A) and starts a game from the title &middot;
    C boards a plane (stand at one with a ticket; on a touch screen the FLY button) &middot;
    on the title, F1 chooses the music and F7 the sound effects (on a touch screen, tap the line between the pillars) &middot;
    P or Esc pauses: items taken and a map; pick a room you've stood in and press Enter to travel there &middot;
    M mutes &middot; V authentic pixel steps &middot; gamepad Start pauses.</p>
    <p>Changes from the original (all in the spirit of the 1987 game; the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/awm/QOL.md">full log</a>):
    pause screen with a map of the world and travel &middot; autosave on every room and Continue after the last life
    (coming back carries on where you were; T on the pause screen goes to the title) &middot; smooth movement at any
    refresh rate &middot; the high score kept in your browser &middot; ENHANCED (switch to ORIGINAL on the pause screen):
    a death before Monty has had two seconds on his feet in a room starts him again where he last had them, so a life
    is lost once, not on every try.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot; the game's own graphics,
    rooms and rules rebuilt from the original program and checked against it frame for frame</p>
  `,
};

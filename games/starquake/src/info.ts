// What the shell's info sheet says about Starquake: the credits, the controls and what was changed (shown by games/shell.ts, from the registry's `load`).
// Data only; the game's code is main.ts.

export const info = {
  title: 'Starquake',
  progress: 'Your progress is saved each time BLOB comes into a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Starquake_(video_game)">Starquake</a> (1985): BLOB must rebuild the
    core of an unstable planet before it explodes. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Original game and design: Stephen Crow</li>
      <li>Commodore 64 version: Nick Strange</li>
      <li>Music: Stephen Crow, played by the C64 version's own player code</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Bubble_Bus_Software">Bubble Bus Software</a>, 1985</li>
    </ul>
    <p>Controls: arrows or WASD move (up picks things up, down builds a platform) &middot; Space fires
    (also Z, X, gamepad A) &middot; P or Esc pauses: a map of the planet; pick a room you've been in and press
    Enter to go back there &middot; M sound on or off &middot; V authentic pixel steps</p>
    <p>Changes from the original (the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/starquake/QOL.md">full log</a>):
    pause screen with map and travel &middot; autosave on every room and Continue (coming back carries on where you were; T on the pause screen goes to the title) &middot; smooth movement at any
    refresh rate &middot; ENHANCED (on unless switched to ORIGINAL): full energy in each room, unlimited lives, and a reward for winning (after the game's own ending: a montage of the planet's places with BLOB running through them, the credits and some true facts, a parade of the creatures and THE END; W on the pause screen shows it again once you've won).</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot; ported from the C64
    original's own code and data</p>
  `,
};

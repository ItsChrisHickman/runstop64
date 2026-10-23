// What the shell's info sheet says about Blackwyche: the credits, the controls and what was changed (shown by games/shell.ts, from the registry's `load`).
// Data only; the game's code is main.ts.

export const info = {
  title: 'Blackwyche',
  progress: 'Your progress is saved each time Pendragon enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Blackwyche">Blackwyche</a> (1985): Sir Arthur Pendragon is trapped aboard a
    haunted galleon and must free the soul of its captain. The third of the Pendragon adventures, after
    <a href="https://en.wikipedia.org/wiki/The_Staff_of_Karnath">The Staff of Karnath</a> and
    <a href="https://en.wikipedia.org/wiki/Entombed_(video_game)">Entombed</a>. All credit belongs to its creators:</p>
    <ul>
      <li>Created and designed by Dave Thomas and Bob Thomas</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Ultimate_Play_the_Game">Ultimate Play the Game</a>
        (Ashby Computers &amp; Graphics), 1985</li>
    </ul>
    <p>This is a translated port, not a rewrite: every routine of the original was translated, instruction for instruction, to
    TypeScript and checked against the original running on an emulated C64, so it plays exactly as it did in 1985.
    The title screen's copyright line is restored (this copy had a cracker's name in it).</p>
    <p>Controls: arrows (or WASD) move, hold Shift to run &middot; Space (or pad A) uses the current action, or straight to one: Z jump, X sword &middot;
    Enter (or any other key) changes the action &middot; P or Esc pauses, with a map &middot;
    R (or F1) restarts &middot; M mutes</p>
    <p>Added for runstop64: progress is saved each time you enter a room (coming back carries on where you were; T on the pause screen goes to the title), and
    after losing you can continue from the last screen you came onto, with full health. P (or the gear) shows a map of where you've
    been. Fights get effects over the picture and sounds of their own (enemies destroyed burst into pixels, a hurt flashes
    red), and there are optional assists (O on the pause screen): 8-way controls, safe for a moment after a hit,
    knockback, hit-stop, and GUIDED (Pendragon says what he makes of things on the status line, in the game's own lettering, and sparkles mark what he can take now), and trapdoors that stay open once they've given way. Beating the game earns an ending after the game's own (a montage of places aboard, the ship's creatures walking through them, THE END; W on the pause screen shows it again once you've won). The full list is in
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/blackwyche/QOL.md">QOL.md</a>.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

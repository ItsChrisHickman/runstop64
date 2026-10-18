// What the shell's info sheet says about Dragonskulle: the credits, the controls and what was changed (shown by games/shell.ts, from the registry's `load`).
// Data only; the game's code is main.ts.

export const info = {
  title: 'Dragonskulle',
  progress: 'Your progress is saved each time Pendragon comes onto a screen: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Dragon_Skulle">Dragonskulle</a> (1986): Sir Arthur Pendragon lands on the
    Island of the Skull and must find and destroy the Crystal Skull of Souls, deep in the caves under it. The fourth and
    last of the Pendragon adventures, after <a href="https://en.wikipedia.org/wiki/The_Staff_of_Karnath">The Staff of Karnath</a>,
    <a href="https://en.wikipedia.org/wiki/Entombed_(video_game)">Entombed</a> and
    <a href="https://en.wikipedia.org/wiki/Blackwyche">Blackwyche</a>. All credit belongs to its creators:</p>
    <ul>
      <li>Created and designed by Dave Thomas and Bob Thomas</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Ultimate_Play_the_Game">Ultimate Play the Game</a>
        (Ashby Computers &amp; Graphics), January 1986 (the title screen says 1985)</li>
    </ul>
    <p>This is a translated port, not a rewrite: every routine of the original was translated, instruction for instruction, to
    TypeScript and checked against the original running on an emulated C64, so it plays exactly as it did in 1986.
    The title screen's copyright line is restored (this copy had a cracker's name in it).</p>
    <p>Controls: arrows (or WASD) move, hold Shift to run &middot; Z jump, X stone, C dig, V cloak: each one straight
    away, as the bar along the bottom of the screen shows them &middot; Space (or pad A) uses the action the hand points
    at, Enter (or any other key) moves the hand one along &middot; P or Esc pauses, with a map &middot; R (or F1)
    restarts &middot; M mutes</p>
    <p>Added for runstop64: the status line (score, lives) at the top of the screen and the actions at the bottom, in
    the order of their keys and labelled with them (the PAUSE icon is P or Esc now); a map of the island on the pause screen (P, or the gear) with travel back to any screen
    you've been on; progress saved each time you come onto a screen (coming back carries on where you were; T on the pause screen goes to the title); after
    losing, continue from the last screen you came onto with all five lives; back to the start of a screen. Fights get
    effects over the picture and sounds of their own. ENHANCED (on unless you switch to ORIGINAL with E on the pause
    screen): 8-way controls, safe for a moment after a hit, knockback, hit-stop, the shovel taken by walking up to it (the original only gave it to a well-aimed stone), sparkles on
    what moves the game on (the starfish, the shovel, the grave of the cloak, the wizards that open a bridge, the dragons,
    the falling rock that gives the cloak again), what is left to do at a bridge or a dragon on the pause screen, and the CLOAK
    icon draining as the cloak runs out. The C64/HD button (bottom right; on a phone beside PAUSE; or H) switches to the HD view (a first version): the same game
    as a lit 3D scene built from its own picture. The full list is in
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/dragonskulle/QOL.md">QOL.md</a>.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

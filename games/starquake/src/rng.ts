/**
 * The original's random numbers: two generators of two bytes each, stirred
 * with the game's two seed bytes. The first is reseeded from the room number
 * whenever a room is drawn (so rooms look the same each visit within a game,
 * but the seeds make every game different).
 */
export class Rng {
  /** $67, $68: the main generator. */
  a = 0; b = 0;
  /** $3F, $40: the second one (stepped with the first by `both`). */
  c = 0; d = 0;
  /** $3B, $3C: the game's seeds. */
  s1 = 0; s2 = 0;

  /** $4054: step the main generator; returns its high byte. */
  next() {
    // lda $67 / clc / adc $68 / adc #$29 / adc $3b / sta $67 / adc $68 / adc $3c / sta $68
    let t = this.a + this.b;
    t = (t & 0xff) + 0x29 + (t >> 8);
    t = (t & 0xff) + this.s1 + (t >> 8);
    this.a = t & 0xff;
    t = this.a + this.b + (t >> 8);
    t = (t & 0xff) + this.s2 + (t >> 8);
    this.b = t & 0xff;
    return this.b;
  }

  /** $4066: step both generators; returns the second's high byte. */
  both() {
    this.next();
    let t = this.c + this.d;
    t = (t & 0xff) + 0x29 + (t >> 8);
    t = (t & 0xff) + this.s1 + (t >> 8);
    this.c = t & 0xff;
    t = this.c + this.d + (t >> 8);
    t = (t & 0xff) + this.s2 + (t >> 8);
    this.d = t & 0xff;
    return this.d;
  }
}

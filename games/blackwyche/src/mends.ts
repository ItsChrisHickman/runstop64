import type { Mend } from '../../shared/native/play';

/**
 * The kilobyte the first game image lacked ($F800-$FBFF: rooms $C and $D, the end of $17's code;
 * build/README.md), put back in saves made before it was mended (they crashed going into those
 * rooms, "CPU stopped in a call to $6003"). `was`: each 64 bytes of it as the first image had it
 * (test/fixtures/hole-f800.bin); test/mend.ts.
 */
export const MENDS: Mend[] = [{
  from: 0xf800, to: 0xfc00, was: [
    0xe34b70d4, 0x1eb15276, 0x9d45a016, 0x27db57b2, 0x733c2da5, 0xc14254a6, 0xcbb6598d, 0x64a9fb9d,
    0x1584a2d1, 0x539aa536, 0x4088df76, 0x1cfd7f2a, 0x4efff7ca, 0x43af8e6a, 0xdf965deb, 0x40e213c5,
  ],
}];

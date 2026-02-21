# rubik-solver

A TypeScript implementation of Kociemba's two-phase algorithm for solving the Rubik's Cube.

## Installation

```bash
npm install rubik-solver
```

## Usage

### Solve a scrambled cube

```ts
import { Cube, initSolver, solve, scramble } from 'rubik-solver';

// initSolver() pre-computes tables (~1-2s, one-time cost).
// Call it once at app startup before solving anything.
initSolver();

// Solve from a move sequence
const cube = new Cube().move("R U R' U' R' F R2 U' R' U' R U R' F'");
const solution = solve(cube);
console.log(solution); // e.g. "F R U R' U' F'"

// Generate a random scramble
const randomScramble = scramble();
console.log(randomScramble);
```

### Build and verify a cube manually

```ts
import { Cube } from 'rubik-solver';

// Solved cube
const cube = new Cube();
console.log(cube.isSolved()); // true

// Apply moves
cube.move("R U R' U'");
console.log(cube.isSolved()); // false

// Serialize to 54-char facelet string
console.log(cube.asString()); // "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"

// Parse from facelet string
const cube2 = Cube.fromString("UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB");

// Inverse an algorithm
console.log(Cube.inverse("R U R' U'")); // "U R U' R'"
```

### Random cube

```ts
import { Cube, solve, initSolver } from 'rubik-solver';

initSolver();

const cube = Cube.random();
const solution = solve(cube);
console.log(`Solution (${solution!.split(' ').length} moves):`, solution);
```

## API

### `initSolver()`
Pre-computes move and pruning tables. Must be called before `solve()` or `scramble()`. Safe to call multiple times — subsequent calls are no-ops.

### `solve(cube, maxDepth?)`
Solves the given `Cube` instance. Returns a move string or `null` if no solution found within `maxDepth` (default: 22).

### `scramble()`
Returns a random scramble sequence as a move string.

### `Cube`
The main cube class.

| Method / Property | Description |
|---|---|
| `new Cube()` | Creates a solved cube |
| `.move(alg)` | Applies an algorithm string in place |
| `.clone()` | Returns a deep copy |
| `.isSolved()` | Returns `true` if the cube is solved |
| `.asString()` | Returns the 54-char facelet string |
| `.randomize()` | Randomizes the cube in place |
| `Cube.fromString(str)` | Parses a 54-char facelet string |
| `Cube.random()` | Returns a new random cube |
| `Cube.inverse(alg)` | Inverts an algorithm string |

## Architecture

```
src/
├── index.ts          ← Public API exports
├── types.ts          ← Enums (Center, Corner, Edge) and CubeState interface
├── constants.ts      ← Table sizes, facelet mappings, base move data
├── math.ts           ← Cnk, factorial, rotateLeft, rotateRight
├── cube.ts           ← Cube class (core logic, coordinates, serialization)
├── tables/
│   └── tables.ts     ← Move table and pruning table generation
└── solver/
    ├── searchState.ts ← SearchState used in phase 1 & 2 search
    └── solver.ts      ← initSolver(), solve(), scramble(), two-phase search
```

## License
MIT
# rubik-solver
# rubik-solver

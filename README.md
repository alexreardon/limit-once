# memoize-first

Create a function that caches the result of the first function call.

```ts
import { memoizeFirst } from 'memoize-first';

function sayHello(name: string): string {
  return `Hello ${name}`;
}
const cached = memoizeFirst(sayHello);

cached('Alex'); // returns "Hello Alex"
cached('Sam'); // returns "Hello Alex" (underlying `sayHello` function not called)
```

## Installation

```bash
# yarn
yarn add memoize-first

# npm
npm install memoize-first

# bun
bun add memoize-one
```

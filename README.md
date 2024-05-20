# tiny-once

Create a function that caches the result of the first function call. `tiny-once` let's you lazily evaluate a value (using a function), and then hold onto the value forever.

```ts
import { once } from 'tiny-once';

function sayHello(name: string): string {
  return `Hello ${name}`;
}
const cached = once(sayHello);

cached('Alex');
// sayHello called and "Hello Alex" is returned
// "Hello Alex" is put into the cache.
// returns "Hello Alex"

cached('Sam');
// sayHello is not called
// "Hello Alex" is returned from the cache.

cached('Greg');
// sayHello is not called
// "Hello Alex" is returned from the cache.
```

```ts
// is-safari.ts

import { once } from 'tiny-once';

// We are caching the result of our 'isSafari()' function as the result
// of `isSafari()` won't change.
export const isSafari = once(function isSafari(): boolean {
  const { userAgent } = navigator;
  return userAgent.includes('AppleWebKit') && !userAgent.includes('Chrome');
});

// app.ts
if (isSafari()) {
  applySafariFix();
}
```

## Installation

```bash
# yarn
yarn add tiny-once

# npm
npm install tiny-once

# bun
bun add tiny-once
```

## Cache clearing (`.clear()`)

You can clear the cache of a memoized function by using a `.clear()` function that is on your cached function.

```ts
import { once } from 'tiny-once';

function sayHello(name: string): string {
  return `Hello ${name}`;
}
const cached = once(sayHello);

cached('Alex');
// sayHello called and "Hello Alex" is returned.
// "Hello Alex" is put into the cache
// cached function returns "Hello Alex"

cached('Sam');
// sayHello is not called
// "Hello Alex" is returned from cache

cached.clear();

cached('Greg');
// sayHello is called and "Hello Greg" is returned.
// "Hello Greg" is put into the cache
// "Hello Greg" is returned.
```

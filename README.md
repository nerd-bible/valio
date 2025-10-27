# valio

Encode and decode Typescript types with extensible error handling.

## Why?

I like [Zod](https://zod.dev), but its codecs don't support
[custom error contexts.](https://github.com/colinhacks/zod/issues/) I tried
adding support to Zod but found it easier to start from scratch.

## Theory

- Data flows through "pipes" with specific input and output types.
  - Both input and output are validated
- Pipes are bidirectional.
  - Input -> output is "decoding"
  - Output -> input is "encoding"
- When encoding or decoding a `Context` is passed which holds:
  - The path to the current value
  - Error formatting function
  - Errors grouped by path

## Practice

Use classes, inheritance, and result types. No errors are thrown.

### Usage

For primitive types the input and output are the same.

```ts
import * as v from "@nerd-bible/valio";

const schema = v.number(); // Pipe<number, number>

expect(schema.decode(5)).toEqual({ success: true, output: 5 });
expect(schema.decodeAny("5")).toEqual({
success: false,
errors: { ".": [{ input: "5", message: "not type number" }] },
});
```

You can add custom checks, but be sure to provide context for error messages.

```ts
import * as v from "@nerd-bible/valio";

const schema = v.number().refine((n) => n == 5, "eq", { n: 5 });

expect(schema.decode(5)).toEqual({ success: true, output: 5 });
expect(schema.encode(3)).toEqual({
	success: false,
	errors: { ".": [{ input: 3, message: "must be 5" }] },
});
```

There are common builtin codecs for coercion.

```ts
import * as v from "@nerd-bible/valio";

const schema = v.codecs.number();

expect(schema.decode("13")).toEqual({ success: true, output: 13 });
```

### Extending

To make a codec with a custom transformer, you can use `v.codecs.custom`.

```ts
import * as v from "@nerd-bible/valio";

function transformToNumber(any: number): number {
	if (typeof any == "number") return any;
	return NaN;
}

const schema = v.codecs.custom(
	v.union([v.string(), v.number(), v.null(), v.undefined()]),
	v.number(),
	{ decode: transformToNumber },
);
```

To make a pipe with any types and transformers, simply extend the class with
your input and output `HalfPipe`s.

```ts
import { Pipe, HalfPipe } from "@nerd-bible/valio";

function transformToNumber(any: number): number {
	if (typeof any == "number") return any;
	return NaN;
}

class AnyToNumber extends Pipe<any, number> {
	constructor() {
		super(
			new HalfPipe("any", (v): v is any => true, transformToNumber),
			new HalfPipe("number", (v): v is number => typeof v == "number"),
		);
	}
}
```

### Custom error messages

Override `errorFmt` in `Context` and pass it to `encode` and `decode`.

```ts
import * as v from "@nerd-bible/valio";

const schema = v.number().refine((n) => n == 5, "eq", { n: 5 });
class MyContext extends v.Context {
	errorFmt() {
		return "You done messed up";
	}
}

expect(schema.decode(3, new MyContext())).toEqual({
	success: false,
	errors: { ".": [{ input: 3, message: "You done messed up" }] },
});
```

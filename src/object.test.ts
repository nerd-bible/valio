import { expect, test } from "bun:test";
import { number } from "./number";
import { object } from "./object";
import type { Output } from "./pipe";

test("object", () => {
	const o = object({
		foo: number().min(4),
	});
	type O = Output<typeof o>;

	expect(o.decode({ foo: 10 })).toEqual({
		output: { foo: 10 } as O,
		errors: undefined,
	});
});

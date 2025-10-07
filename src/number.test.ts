import { test, expect } from "bun:test";
import { number, codecNumber } from "./number";

test("custom validator", () => {
	const schema = number().refine((v) => (v == 5 ? "" : "must be 5"));
	expect(schema.decode(3)).toEqual({
		output: 3,
		errors: {
			".": ["must be 5"],
		},
	});
});

test("min", () => {
	const schema = number().min(5);
	expect(schema.decode(3)).toEqual({
		output: 3,
		errors: {
			".": ["must be > 5"],
		},
	});
});

test("fail parse", () => {
	const schema = number().min(5);
	expect(schema.decode("3")).toEqual({
		output: undefined,
		errors: {
			".": ["not a number"],
		},
	});
});

test("decode and validate", () => {
	const schema = codecNumber().min(5);
	expect(schema.decode("3")).toEqual({
		output: 3,
		errors: {
			".": ["must be > 5"],
		},
	});
});

import { test, expect } from "bun:test";
import { array } from "./array";
import { codecNumber, number } from "./number";
import type { Output } from "./pipe";

test("not an array", () => {
	const schema = array(number());

	expect(schema.decode(54)).toEqual({
		errors: {
			".": ["not an array"],
		},
	});
});

test("good", () => {
	const schema = array<number>(number());
	type O = Output<typeof schema>;

	expect(schema.decode([54])).toEqual({
		output: [54] as O,
	});
});

test("failed element", () => {
	const schema = array(number().min(4).min(5));

	expect(schema.decode(["5", 5])).toEqual({
		errors: {
			".0": ["not a number"],
			".1": ["must be > 5"],
		},
	});
});

test("number codec", () => {
	const schema = array(codecNumber().min(4).min(5));

	expect(schema.decode(["NaN", "5", 5])).toEqual({
		output: [NaN, 5, 5],
		errors: {
			".0": ["must be > 4", "must be > 5"],
			".1": ["must be > 5"],
			".2": ["must be > 5"],
		},
	});
});

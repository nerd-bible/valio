import { test, expect } from "bun:test";
import { array } from "./array";
import { codecNumber } from "./number";

test("decode and validate", () => {
	const schema = array(codecNumber().min(4).min(5));

	expect(schema.decode(["a", "5", 5])).toEqual({
		output: [NaN, 5, 5],
		errors: {
			".0": ["must be > 4", "must be > 5"],
			".1": ["must be > 5"],
			".2": ["must be > 5"],
		},
	});
});

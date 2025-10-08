import { test, expect } from "bun:test";
import { codecNumber, number } from "./number";
import { string } from "./string";
import { union } from "./union";

test("union", () => {
	const schema = union([string(), number()]);

	expect(schema.decode(42)).toEqual({
		output: 42
	});
	expect(schema.decode("asdf")).toEqual({
		output: "asdf"
	});
	expect(schema.decode({})).toEqual({
		errors: {
			".": [
				"not any of: string,number",
			]
		}
	});
});

test("codec member", () => {
	const schema = union([codecNumber(), string()]);

	expect(schema.decode("42")).toEqual({
		output: 42
	});
	expect(schema.decode("asdf")).toEqual({
		output: "asdf"
	});
	expect(schema.decode({})).toEqual({
		errors: {
			".": [
				"not any of: number,string",
			]
		}
	});
});

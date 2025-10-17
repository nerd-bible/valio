import { test, expect } from "bun:test";
import * as v from "./index";

test("custom validator", () => {
	const schema = v.number().refine((n) => (n == 5 ? "" : "must be 5"));

	expect(schema.decode(3)).toEqual({
		success: false,
		errors: { ".": [{ input: 3, message: "must be 5" }] },
	});
	expect(schema.encode(3)).toEqual({
		success: false,
		errors: { ".": [{ input: 3, message: "must be 5" }] },
	});
});

test("double min", () => {
	const schema = v.number().gt(5).gt(2);

	expect(schema.decode(3)).toEqual({
		success: false,
		errors: {
			".": [{ input: 3, message: "must be > 5" }],
		},
	});
	expect(schema.decode(1)).toEqual({
		success: false,
		errors: {
			".": [
				{ input: 1, message: "must be > 5" },
				{ input: 1, message: "must be > 2" },
			],
		},
	});
	expect(schema.decode(10)).toEqual({
		success: true,
		output: 10,
	});
	expect(schema.decodeAny("3")).toEqual({
		success: false,
		errors: {
			".": [
				{
					input: "3",
					message: "not type number",
				},
			],
		},
	});
});

test("pipe", () => {
	const schema = v.string().pipe(v.number() as v.Pipe<any, number>);

	expect(schema.decode("42")).toEqual({
		success: false,
		errors: {
			".": [{ input: "42", message: "not type number" }],
		},
	});
});

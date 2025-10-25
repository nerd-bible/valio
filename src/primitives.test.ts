import { expect, test } from "bun:test";
import * as v from "./index";

test("number", () => {
	const schema = v.number();

	expect(schema.decode(5)).toEqual({ success: true, output: 5 });
	expect(schema.decodeAny("5")).toEqual({
		success: false,
		errors: { ".": [{ input: "5", message: "not type number" }] },
	});
});

test("custom validator", () => {
	const schema = v.number().refine((n) => n == 5, "eq", { n: 5 });

	expect(schema.decode(5)).toEqual({ success: true, output: 5 });
	expect(schema.encode(3)).toEqual({
		success: false,
		errors: { ".": [{ input: 3, message: "must be 5" }] },
	});
});

test("custom context", () => {
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

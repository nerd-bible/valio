import { test, expect } from "bun:test";
import * as v from "./index";

test("custom validator", () => {
	const schema = v.number().refine((n) => (n == 5 ? "" : "must be 5"));
	// Type test
	type O = v.Output<typeof schema>;

	expect(schema.decode(3 as O)).toEqual({
		success: false,
		errors: {
			".": [{ input: 3, message: "must be 5" }],
		},
	});
});

test("min", () => {
	const schema = v.number().min(5).min(2);

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
	expect(schema.decode("3")).toEqual({
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

test("number codec", () => {
	const schema = v.codecs.number();

	expect(schema.decode("13")).toEqual({ success: true, output: 13 });
	expect(schema.decode("-1.3")).toEqual({ success: true, output: -1.3 });
	expect(schema.decode("asdf")).toEqual({
		success: false,
		errors: {
			".": [{ input: "asdf", message: "could not parse number" }],
		},
	});
	expect(schema.decode("Infinity")).toEqual({
		success: true,
		output: Infinity,
	});
	expect(schema.decode("-Infinity")).toEqual({
		success: true,
		output: -Infinity,
	});

	expect(schema.encode(1.3)).toEqual({ success: true, output: 1.3 });
});

// test("string codec", () => {
// 	const schema = v.codecs.string();
//
// 	expect(schema.decode(13)).toEqual({ success: true, output: "13" });
// 	expect(schema.decode(null)).toEqual({ success: true, output: "null" });
// 	expect(schema.encode(null as any)).toEqual({
// 		success: false,
// 		errors: {
// 			".": [
// 				{
// 					input: null,
// 					message: "not type string",
// 				},
// 			],
// 		},
// 	});
// 	expect(schema.encode("asdf")).toEqual({ success: true, output: "asdf" });
// });

test("pipe", () => {
	const schema = v.string().pipe(v.number());

	expect(schema.decode("42")).toEqual({
		success: false,
		errors: {
			".": [{ input: "42", message: "not type number" }],
		},
	});
});

test("2 pipes", () => {
	const schema = v.codecs.number().pipe(v.number().min(5));

	expect(schema.decode("3")).toEqual({
		success: false,
		errors: {
			".": [{ input: 3, message: "must be > 5" }],
		},
	});
	// expect(schema.decode(undefined)).toEqual({ success: true, output: NaN });
	// expect(schema.decode(null)).toEqual({ success: true, output: NaN });
});

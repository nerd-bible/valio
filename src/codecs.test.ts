import { test, expect } from "bun:test";
import * as v from "./index";

test("number codec", () => {
	const schema = v.codecs.number();

	expect(schema.decode("13")).toEqual({ success: true, output: 13 });
	expect(schema.max(12).decode("13")).toEqual({
		success: false,
		errors: { ".": [{ input: 13, message: "must be < 12" }] },
	});
	expect(schema.decode("-1.3")).toEqual({ success: true, output: -1.3 });
	expect(schema.decode("asdf")).toEqual({
		success: false,
		errors: {
			".": [{ input: "asdf", message: "could not parse number" }],
		},
	});
	expect(schema.decode("Infinity")).toEqual({
		success: false,
		errors: {
			".": [
				{
					input: Infinity,
					message: "must be < 12",
				},
			],
		},
	});
	expect(schema.decode("-Infinity")).toEqual({
		success: true,
		output: -Infinity,
	});
	expect(schema.encode(1.3)).toEqual({ success: true, output: 1.3 });
});

test("2 pipes", () => {
	const schema = v.codecs.number();

	expect(schema.pipe(v.number().min(5)).decode("3")).toEqual({
		success: false,
		errors: {
			".": [{ input: 3, message: "must be > 5" }],
		},
	});
	expect(schema.decode(undefined)).toEqual({ success: true, output: NaN });
	expect(schema.decode(null)).toEqual({ success: true, output: NaN });
});

test("array number codec", () => {
	const schema = v.array(v.codecs.number().min(4).min(5));

	expect(schema.decode(["10a", "11b"])).toEqual({
		success: true,
		output: [10, 11],
	});
	expect(schema.decode(["NaN", "5", 5])).toEqual({
		errors: {
			".0": [
				{ input: NaN, message: "must be > 4" },
				{ input: NaN, message: "must be > 5" },
			],
			".1": [{ input: 5, message: "must be > 5" }],
			".2": [{ input: 5, message: "must be > 5" }],
		},
		success: false,
	});
});

test("boolean codec", () => {
	const schema = v.codecs.boolean({ true: ["yes"], false: ["no"] });

	expect(schema.decode("yes")).toEqual({ success: true, output: true });
	expect(schema.decode("no")).toEqual({ success: true, output: false });
	expect(schema.decode("")).toEqual({ success: true, output: false });
	expect(schema.decode("1")).toEqual({ success: true, output: true });
	expect(schema.decode(false)).toEqual({ success: true, output: false });
	expect(schema.decode(0)).toEqual({ success: true, output: false });
});

// test("string codec", () => {
// 	const schema = v.codecs.string();
//
// 	expect(schema.decode(13)).toEqual({ success: true, output: "13" });
// 	expect(schema.decode(null)).toEqual({ success: true, output: "null" });
// 	expect(schema.encode(null as any)).toEqual({
// 		success: false,
// 		errors: { ".": [ { input: null, message: "not type string" } ] },
// 	});
// 	expect(schema.encode("asdf")).toEqual({ success: true, output: "asdf" });
// });

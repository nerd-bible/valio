import { test, expect } from "bun:test";
import * as v from "./index";

test("array", () => {
	const schema = v.array(v.number());

	expect(schema.decode([54])).toEqual({ success: true, output: [54] });
	expect(schema.decode(["54"])).toEqual({
		success: false,
		errors: {
			".0": [
				{
					input: "54",
					message: "not type number",
				},
			],
		},
	});
	expect(schema.decode(54)).toEqual({
		success: false,
		errors: {
			".": [{ input: 54, message: "not type array" }],
		},
	});
});

// test("array codec", () => {
// 	const schema = v.array(v.codecs.number()).codec({
// 		decode: (v: string) => {
// 			return { success: true, output: v.split(",") };
// 		},
// 		encode: (v: Array<string>) => {
// 			return { success: true, output: v.join(",") };
// 		},
// 	});
//
// 	expect(schema.decode("5,4")).toEqual({ success: true, output: [5, 4] });
// 	expect(schema.decode([5, 4])).toEqual({ success: false });
//
// 	expect(schema.encode([5,4])).toEqual({ success: true, output: "5,4" });
// 	expect(schema.encode("5,4")).toEqual({ success: false });
// });

// test("good", () => {
// 	const schema = array<number>(number());
// 	type O = Output<typeof schema>;
//
// 	expect(schema.decode([54])).toEqual({
// 		output: [54] as O,
// 	});
// });
//
// test("failed element", () => {
// 	const schema = array(number().min(4).min(5));
//
// 	expect(schema.decode(["5", 5])).toEqual({
// 		errors: {
// 			".0": ["not a number"],
// 			".1": ["must be > 5"],
// 		},
// 	});
// });
//
// test("number codec", () => {
// 	const schema = array(codecNumber().min(4).min(5));
//
// 	expect(schema.decode(["NaN", "5", 5])).toEqual({
// 		output: [NaN, 5, 5],
// 		errors: {
// 			".0": ["must be > 4", "must be > 5"],
// 			".1": ["must be > 5"],
// 			".2": ["must be > 5"],
// 		},
// 	});
// });
//
// test("union", () => {
// 	const schema = union([string(), number()]);
//
// 	expect(schema.decode(42)).toEqual({
// 		output: 42,
// 	});
// 	expect(schema.decode("asdf")).toEqual({
// 		output: "asdf",
// 	});
// 	expect(schema.decode({})).toEqual({
// 		errors: {
// 			".": ["not any of: string,number"],
// 		},
// 	});
// });
//
// test("codec member", () => {
// 	const schema = union([codecNumber(), string()]);
//
// 	expect(schema.decode("42")).toEqual({
// 		output: 42,
// 	});
// 	expect(schema.decode("asdf")).toEqual({
// 		output: "asdf",
// 	});
// 	expect(schema.decode({})).toEqual({
// 		errors: {
// 			".": ["not any of: number,string"],
// 		},
// 	});
// });
//
// test("object", () => {
// 	const o = object({
// 		foo: number().min(4),
// 	});
// 	type O = Output<typeof o>;
//
// 	expect(o.decode({ foo: 10 })).toEqual({
// 		output: { foo: 10 } as O,
// 		errors: undefined,
// 	});
// });

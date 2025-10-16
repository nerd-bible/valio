import { test, expect } from "bun:test";
import * as v from "./index";

test("array", () => {
	const schema = v.array(v.number());

	expect(schema.decode([54])).toEqual({ success: true, output: [54] });
	expect(schema.decode(["54"])).toEqual({
		success: false,
		errors: { ".0": [{ input: "54", message: "not type number" }] },
	});
	expect(schema.decodeAny(54)).toEqual({
		success: false,
		errors: { ".": [{ input: 54, message: "not type array" }] },
	});
});

test("array failed element", () => {
	const schema = v.array(v.number().min(4).min(5));
	console.log(v.number().min(4).min(5).o.checks)

	expect(schema.decode(["5", 5])).toEqual({
		success: false,
		errors: {
			".0": [{ input: "5", message: "not type number" }],
			".1": [{ input: 5, message: "must be > 5" }],
		},
	});
});

test("object", () => {
	const o = v.object({ foo: v.number().min(4) });
	type O = v.Output<typeof o>;

	expect(o.decode({ foo: 10 })).toEqual({
		success: true,
		output: { foo: 10 } as O,
	});
	expect(o.decode({ bar: 10 })).toEqual({
		success: false,
		errors: {
			".foo": [
				{
					input: undefined,
					message: "not type number",
				},
			],
		},
	});
});

test("nested object", () => {
	const o = v.object({
		foo: v.object({ bar: v.number().min(4) }),
	});

	expect(o.decode({ foo: { bar: 10 } })).toEqual({
		success: true,
		output: { foo: { bar: 10 } },
	});
	expect(o.decode({ bar: 10 })).toEqual({
		success: false,
		errors: { ".foo": [{ input: undefined, message: "not type object" }] },
	});
});

test("record", () => {
	const o = v.record(v.string(), v.number());

	expect(o.decode({ bar: 10 })).toEqual({
		success: true,
		output: { bar: 10 },
	});
	expect(o.decode({ foo: { bar: 10 } })).toEqual({
		success: false,
		errors: { ".foo": [{ input: { bar: 10 }, message: "not type number" }] },
	});
});

test("union", () => {
	const schema = v.union([v.string(), v.number()]);
	type O = v.Output<typeof schema>;

	expect(schema.decode(42 as O)).toEqual({ success: true, output: 42 });
	expect(schema.decode("asdf")).toEqual({ success: true, output: "asdf" });
	expect(schema.decodeAny({})).toEqual({
		success: false,
		errors: { ".": [{ input: {}, message: "not type string|number" }] },
	});
});

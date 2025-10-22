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
	const schema = v.array(v.number().gt(4).gt(5));

	expect(schema.decode(["5", 5])).toEqual({
		success: false,
		errors: {
			".0": [{ input: "5", message: "not type number" }],
			".1": [{ input: 5, message: "must be > 5" }],
		},
	});
});

test("object", () => {
	const o = v.object({ foo: v.number().gt(4) });
	type O = v.Output<typeof o>;

	expect(o.decode({ foo: 10 })).toEqual({
		success: true,
		output: { foo: 10 } as O,
	});
	expect(o.decode({ foo: 10, bar: 10 })).toEqual({
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

test("loose object", () => {
	const o = v.object({ foo: v.number().gt(4) }).loose();
	type O = v.Output<typeof o>;

	expect(o.isLoose).toBe(true);
	expect(o.decode({ foo: 10, bar: 10 })).toEqual({
		success: true,
		output: { foo: 10, bar: 10 } as O,
	});
});

test("nested object", () => {
	const o = v.object({
		foo: v.object({ bar: v.number().gt(4) }),
	});

	expect(o.decode({ foo: { bar: 10 } })).toEqual({
		success: true,
		output: { foo: { bar: 10 } },
	});
	expect(o.decode({ bar: 10 })).toEqual({
		success: false,
		errors: {
			".foo": [
				{
					input: undefined,
					message: "not type object",
				},
			],
		},
	});
});

test("partial object", () => {
	const o = v.object({ foo: v.number().gt(4) }).partial({ foo: true });
	type O = v.Output<typeof o>;

	expect(o.decode({ foo: 10 })).toEqual({
		success: true,
		output: { foo: 10 } as O,
	});
	expect(o.decode({ foo: undefined })).toEqual({
		success: true,
		output: { foo: undefined } as O,
	});
	expect(o.decode({})).toEqual({
		success: true,
		output: {} as O,
	});
});

test("pick object", () => {
	const o = v
		.object({ foo: v.number().gt(4), bar: v.number() })
		.pick({ foo: true });
	type O = v.Output<typeof o>;

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
	expect(o.decode({ foo: 10, bar: 10 } as O)).toEqual({
		success: true,
		output: { foo: 10 },
	});
	expect(o.decode({})).toEqual({
		success: false,
		errors: { ".foo": [{ input: undefined, message: "not type number" }] },
	});
});

test("omit object", () => {
	const o = v
		.object({ foo: v.number().gt(4), bar: v.number() })
		.omit({ foo: true });
	type O = v.Output<typeof o>;

	expect(o.decode({ bar: 10 })).toEqual({
		success: true,
		output: { bar: 10 } as O,
	});
	expect(o.decode({ foo: undefined, bar: 10 })).toEqual({
		success: true,
		output: { bar: 10 },
	});
	expect(o.decode({})).toEqual({
		success: false,
		errors: { ".bar": [{ input: undefined, message: "not type number" }] },
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

test("extend object", () => {
	const o = v.object({ foo: v.number().gt(4) }).extend({ bar: v.number() });
	type O = v.Output<typeof o>;

	expect(o.decode({ foo: 10, bar: 5 })).toEqual({
		success: true,
		output: { foo: 10, bar: 5 } as O,
	});
	expect(o.decode({})).toEqual({
		success: false,
		errors: {
			".bar": [
				{
					input: undefined,
					message: "not type number",
				},
			],
			".foo": [
				{
					input: undefined,
					message: "not type number",
				},
			],
		},
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

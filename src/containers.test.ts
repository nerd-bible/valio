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

test("array failed element", () => {
	const schema = v.array(v.number().min(4).min(5));

	expect(schema.decode(["5", 5])).toEqual({
		success: false,
		errors: {
			".0": [{ input: "5", message: "not type number" }],
			".1": [{ input: 5, message: "must be > 5" }],
		},
	});
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
				{
					input: NaN,
					message: "must be > 4",
				},
				{
					input: NaN,
					message: "must be > 5",
				},
			],
			".1": [
				{
					input: 5,
					message: "must be > 5",
				},
			],
			".2": [
				{
					input: 5,
					message: "must be > 5",
				},
			],
		},
		success: false,
	});
});

test("object", () => {
	const o = v.object({
		foo: v.number().min(4),
	});
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

test("record", () => {
	const o = v.record(v.string(), v.number());

	expect(o.decode({ bar: 10 })).toEqual({
		success: true,
		output: { bar: 10 },
	});
	expect(o.decode({ foo: { bar: 10 } })).toEqual({
		success: false,
		errors: {
			".foo": [
				{
					input: { bar: 10 },
					message: "not type number",
				},
			],
		},
	});
});

test("union", () => {
	const schema = v.union([v.string(), v.number()]);

	expect(schema.decode(42)).toEqual({
		success: true,
		output: 42,
	});
	expect(schema.decode("asdf")).toEqual({
		success: true,
		output: "asdf",
	});
	expect(schema.decode({})).toEqual({
		success: false,
		errors: {
			".": [
				{
					input: {},
					message: "not type string|number",
				},
			],
		},
	});
});

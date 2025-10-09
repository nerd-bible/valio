import { test, expect } from "bun:test";
import { number } from "./number";
import type { Output } from "./pipe";
import { string } from "./string";

test("pipe basics", () => {
	const schema = string().coerce().pipe(number());
	expect(schema.decode(undefined)).toEqual({
		success: false,
		errors: {
			".": [{ input: "undefined", message: "not type number" }],
		},
	});
});

test("custom validator", () => {
	const schema = number().refine((v) => (v == 5 ? "" : "must be 5"));
	type O = Output<typeof schema>;
	expect(schema.decode(3 as O)).toEqual({
		success: false,
		errors: {
			".": [{ input: 3, message: "must be 5" }],
		},
	});
});

test("min", () => {
	const schema = number().min(5);
	expect(schema.decode(3)).toEqual({
		success: false,
		errors: {
			".": [{ input: 3, message: "must be > 5" }],
		},
	});
	expect(schema.decode(10)).toEqual({
		success: true,
		output: 10,
	});
});

test("fail parse", () => {
	const schema = number().min(5);
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

test("coerce", () => {
	const schema = number().coerce();
	expect(schema.decode("13")).toEqual({ success: true, output: 13 });
	expect(schema.decode("-1.3")).toEqual({ success: true, output: -1.3 });
	expect(schema.decode("asdf")).toEqual({
		success: false,
		errors: {
			".": [{ input: "asdf", message: "could not parseFloat" }],
		},
	});
	expect(schema.min(5).decode("3")).toEqual({
		success: false,
		errors: {
			".": [{ input: 3, message: "must be > 5" }],
		},
	});
	expect(schema.decode(undefined)).toEqual({ success: true, output: NaN });
	expect(schema.decode(null)).toEqual({ success: true, output: NaN });
	expect(schema.decode("Infinity")).toEqual({ success: true, output: Infinity });
	expect(schema.decode("-Infinity")).toEqual({ success: true, output: -Infinity });
});

import { test } from "node:test";
import { deepEqual } from "node:assert";
import * as v from "./index.ts";

test("number codec", () => {
	const schema = v.codecs.number();

	deepEqual(schema.decode("13"), { success: true, output: 13 });
	deepEqual(schema.lt(12).decode("13"), {
		success: false,
		errors: { ".": [{ input: 13, message: "must be < 12" }] },
	});
	deepEqual(schema.decode("-1.3"), { success: true, output: -1.3 });
	deepEqual(schema.decode("asdf"), {
		success: false,
		errors: {
			".": [{ input: "asdf", message: "could not coerce to number" }],
		},
	});
	deepEqual(schema.decode("Infinity"), {
		success: true,
		output: Number.POSITIVE_INFINITY,
	});
	deepEqual(schema.decode("-Infinity"), {
		success: true,
		output: Number.NEGATIVE_INFINITY,
	});
	deepEqual(schema.encode(1.3), { success: true, output: 1.3 });
});

test("2 pipes", () => {
	const schema = v.codecs.number();
	const next = schema.pipe(v.number().gt(5));

	deepEqual(next.decode("3"), {
		success: false,
		errors: {
			".": [{ input: 3, message: "must be > 5" }],
		},
	});
	deepEqual(schema.decode(undefined), {
		success: true,
		output: Number.NaN,
	});
	deepEqual(schema.decode(null), { success: true, output: Number.NaN });
});

test("array number codec", () => {
	const schema = v.array(v.codecs.number().gt(4).gt(5));

	deepEqual(schema.decode(["10a", "11b"]), {
		success: true,
		output: [10, 11],
	});
	deepEqual(schema.decode(["NaN", "5", 5]), {
		errors: {
			".0": [
				{ input: Number.NaN, message: "must be > 4" },
				{ input: Number.NaN, message: "must be > 5" },
			],
			".1": [{ input: 5, message: "must be > 5" }],
			".2": [{ input: 5, message: "must be > 5" }],
		},
		success: false,
	});
});

test("boolean codec", () => {
	const schema = v.codecs.boolean({ true: /yes/, false: /no/ });

	deepEqual(schema.decode("yes"), { success: true, output: true });
	deepEqual(schema.decode("no"), { success: true, output: false });
	deepEqual(schema.decode(""), { success: true, output: false });
	deepEqual(schema.decode("1"), { success: true, output: true });
	deepEqual(schema.decode(false), { success: true, output: false });
	deepEqual(schema.decode(0), { success: true, output: false });
});

// test("string codec", () => {
// 	const schema = v.codecs.string();
//
// 	deepEquals(schema.decode(13), { success: true, output: "13" });
// 	deepEquals(schema.decode(null), { success: true, output: "null" });
// 	deepEquals(schema.encode(null as any), {
// 		success: false,
// 		errors: { ".": [ { input: null, message: "not type string" } ] },
// 	});
// 	deepEquals(schema.encode("asdf"), { success: true, output: "asdf" });
// });

import * as c from "./containers.ts";
import type { Context, Pipe, Result } from "./pipe";
import * as p from "./primitives.ts";

export function custom<I, O>(
	input: Pipe<I, any>,
	output: Pipe<any, O>,
	codec: {
		encode?(input: O, ctx: Context): Result<I>;
		decode?(output: I, ctx: Context): Result<O>;
	},
): Pipe<I, O> {
	const res = output.clone() as any;
	res.i = input.i.clone();
	res.i.transform = codec.decode;
	res.o.transform = codec.encode;
	return res;
}

export function number(
	parser = Number.parseFloat,
): p.Comparable<string | number | null | undefined, number> {
	return custom(p.any(), p.number(), {
		decode(input, ctx) {
			if (typeof input === "number") return { success: true, output: input };
			if (!input || input.toLowerCase() === "nan")
				return { success: true, output: Number.NaN };

			const output = parser(input);
			if (!Number.isNaN(output)) return { success: true, output };

			ctx.pushErrorFmt("coerce", input, { expected: "number" });
			return { success: false, errors: ctx.errors };
		},
	}) as ReturnType<typeof number>;
}

export function boolean(opts: {
	true?: RegExp;
	false?: RegExp;
}): Pipe<any, boolean> {
	return custom(p.any(), p.boolean(), {
		decode(input, ctx) {
			if (typeof input === "boolean") return { success: true, output: input };
			if (typeof input === "string") {
				if (opts.true?.test(input)) return { success: true, output: true };
				if (opts.false?.test(input)) return { success: true, output: false };
			}

			ctx.pushErrorFmt("coerce", input, { expected: "boolean" });
			return { success: false, errors: ctx.errors };
		},
	});
}

import type { Context, Pipe, Result } from "./pipe";
import * as p from "./primitives";
import * as c from "./containers";

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
	parser = parseFloat,
): p.Comparable<string | number | null | undefined, number> {
	return custom(
		c.union([p.string(), p.number(), p.null(), p.undefined()]),
		p.number(),
		{
			decode(input, ctx) {
				if (typeof input == "number") return { success: true, output: input };
				if (input == null || input.toLowerCase() == "nan")
					return { success: true, output: NaN };

				const output = parser(input);
				if (!isNaN(output)) return { success: true, output };

				ctx.pushErrorFmt("coerce", input, { expected: "number" });
				return { success: false, errors: ctx.errors };
			},
		},
	) as ReturnType<typeof number>;
}

export function boolean(opts: {
	true?: string[];
	false?: string[];
}): Pipe<any, boolean> {
	return custom(p.any(), p.boolean(), {
		decode(input) {
			if (typeof input === "string") {
				if (opts.true?.includes(input)) return { success: true, output: true };
				if (opts.false?.includes(input))
					return { success: true, output: false };
			}
			return { success: true, output: Boolean(input) };
		},
	});
}

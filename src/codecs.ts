import type { Context, Pipe, Result } from "./pipe";
import * as p from "./primitives";
import * as c from "./containers";

export function custom<A, B, C>(
	input: Pipe<A, B>,
	output: Pipe<B, C>,
	codec: {
		encode?(input: C, ctx: Context): Result<B>;
		decode?(output: A, ctx: Context): Result<B>;
	},
): Pipe<A, C> {
	const res = output.clone() as any;
	res.i = { ...input.i, transform: codec.decode };
	res.o.transform = codec.encode;
	return res;
}

export function number(
	parser = parseFloat,
): p.Number & Pipe<string | number | null | undefined, number> {
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

				ctx.addError({ input, message: "could not parse number" });
				return { success: false, errors: ctx.errors };
			},
		},
	) as ReturnType<typeof number>;
}

export function boolean(opts: {
	true?: string[];
	false?: string[];
}): p.Boolean & Pipe<any, boolean> {
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

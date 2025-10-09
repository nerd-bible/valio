import { Pipe, type Context, type Output, type Result } from "./pipe";

class UnionValidator<T extends Readonly<Array<Pipe<any, any>>>> extends Pipe<
	unknown,
	Output<T[number]>
> {
	type = "union" as const;

	constructor(public options: T) {
		super();
	}

	isT(data: unknown, ctx: Context): data is Output<T[number]> {
		for (const f of this.options) {
			if (f.isOutput(data, ctx)) return true;
		}
		return false;
	}

	decode(data: unknown, ctx: Context = {}): Result<Output<T[number]>> {
		const isT = this.isT(data, ctx);
		if (!isT) {
			this.addError(ctx, {
				message: `not any of: ${this.options.map((o) => o.type)}`,
				input: data,
			});
			return { errors: ctx.errors! };
		}

		const newCtx: Context = {};
		for (const s in this.options) {
			const decoded = this.options[s]!.decode(data, newCtx);
			if ("output" in decoded) return { output: decoded.output };
		}

		ctx.errors = {
			...newCtx.errors,
			...(ctx.errors ?? {}),
		};
		return { errors: ctx.errors };
	}
}

export function union<T extends Readonly<Array<Pipe<any, any>>>>(options: T) {
	return new UnionValidator<T>(options);
}

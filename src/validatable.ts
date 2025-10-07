export type Errors = {
	[jsonPath: string]: string[];
};

/** During encoding, decoding, or validation. */
export type Context<T> = {
	jsonPath?: string[];
	errors?: Errors;
	userdata?: T;
};

export type Result<T> = { output: T } | { errors: Errors };

export abstract class Validatable<T, U> {
	validators: ((data: T, ctx: Context<U>) => string)[] = [];

	abstract isT(data: unknown, ctx: Context<U>): data is T;

	protected addError(msg: string, ctx: Context<U>) {
		if (msg) {
			ctx.jsonPath ??= ["."];
			const key = ctx.jsonPath.join("");
			ctx.errors ??= {};
			ctx.errors[key] ??= [];
			ctx.errors[key].push(msg);
		}
	}

	decode(
		data: unknown,
		ctx: Context<U> = {},
	): Result<T> | { output: T; errors: Errors } {
		const isT = this.isT(data, ctx);

		if (isT) {
			for (const validator of this.validators) {
				this.addError(validator(data, ctx), ctx);
			}
		}
		ctx.jsonPath?.pop();

		if (isT && ctx.errors) {
			return { output: data, errors: ctx.errors };
		}

		return { errors: ctx.errors! };
	}

	refine(validator: (data: T, ctx: Context<U>) => string) {
		this.validators.push(validator);
		return this;
	}
}

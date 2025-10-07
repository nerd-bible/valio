import { Validatable, type Context, type Errors, type Result } from "./validatable";

class ArrayValidator<T, U = never> extends Validatable<Array<T>, U> {
	constructor(private eleValidator: Validatable<T, U>) {
		super();
	}

	isT(data: unknown, ctx: Context<U>) {
		const res = Array.isArray(data);
		if (!res) this.addError("not an array", ctx);
		return res;
	}

	decode(
		data: unknown[],
		ctx: Context<U> = {},
	): Result<Array<T>> | { output: Array<T>; errors: Errors } {
		const isT = this.isT(data, ctx);
		if (!isT) return { errors: ctx.errors! };

		const output = new Array<T>(data.length);
		let failedEle = false;

		ctx.jsonPath ??= ["."];
		const arrIndex = ctx.jsonPath.length;
		for (let i = 0; i < data.length; i++) {
			ctx.jsonPath[arrIndex] = i.toString();
			const decoded = this.eleValidator.decode(data[i], ctx);
			if ("output" in decoded) output[i] = decoded.output;
			else failedEle = true;
		}

		if (failedEle) return { errors: ctx.errors! };

		return {
			output,
			errors: ctx.errors,
		};
	}
}

export function array<T, U = never>(s: Validatable<T, U>) {
	return new ArrayValidator<T, U>(s);
}

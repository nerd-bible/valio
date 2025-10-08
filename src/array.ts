import { Pipe, type Context, type Errors, type Result } from "./pipe";

class ArrayValidator<T> extends Pipe<number, Array<T>> {
	type = "array" as const;

	constructor(public element: Pipe<unknown, T>) {
		super();
	}

	isT(data: unknown) {
		return Array.isArray(data);
	}

	decode(data: unknown, ctx: Context = {}): Result<Array<T>> {
		const isT = this.isT(data);
		if (!isT) {
			this.addError(`not an ${this.type}`, ctx);
			return { errors: ctx.errors! };
		}

		const output = new Array<T>(data.length);
		let failedEle = false;

		ctx.jsonPath ??= [];
		const arrIndex = ctx.jsonPath.length;
		for (let i = 0; i < data.length; i++) {
			ctx.jsonPath[arrIndex] = i.toString();
			const decoded = this.element.decode(data[i], ctx);
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

export function array<T>(element: Pipe<unknown, T>) {
	return new ArrayValidator<T>(element);
}

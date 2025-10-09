import { Pipe, type Context, type Result } from "./pipe";

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
			this.addTypeError(ctx, data);
			return { errors: ctx.errors! };
		}

		const output = new Array<T>(data.length);
		let failedEle = false;

		ctx.jsonPath ??= [];
		const arrIndex = ctx.jsonPath.length;
		for (let i = 0; i < data.length; i++) {
			ctx.jsonPath[arrIndex] = i.toString();
			console.log("decode", ctx.jsonPath);
			const decoded = this.element.decode(data[i], ctx);
			if ("output" in decoded) output[i] = decoded.output;
			else failedEle = true;
		}

		ctx.jsonPath.pop();

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

import {
	Pipe,
	type Context,
	type Output,
	type Result,
} from "./pipe";

type ShapeOutput<T extends Record<string, Pipe<any, any>>> = {
	// @ts-ignore
	[K in keyof T]: Output<T[K]>;
};

class ObjectValidator<T extends Record<string, Pipe<any, any>>> extends Pipe<
	unknown,
	ShapeOutput<T>
> {
	type = "object" as const;

	constructor(public shape: T) {
		super();
	}

	isT(data: unknown): data is ShapeOutput<T> {
		return typeof data === "object";
	}

	decode(data: unknown, ctx: Context = {}): Result<ShapeOutput<T>> {
		const isT = this.isT(data);
		if (!isT) {
			this.addTypeError(ctx, data);
			return { errors: ctx.errors! };
		}

		const output: any = {};
		let failedProp = false;

		ctx.jsonPath ??= [];
		const last = ctx.jsonPath.length;

		for (const s in this.shape) {
			ctx.jsonPath[last] = s;
			const decoded = this.shape[s]!.decode((data as any)[s], ctx);
			if ("output" in decoded) output[s] = decoded.output;
			else failedProp = true;
		}

		ctx.jsonPath.pop();

		if (failedProp) return { errors: ctx.errors! };

		return {
			output: output as ShapeOutput<T>,
			errors: ctx.errors,
		};
	}
}

export function object<T extends Record<string, Pipe<any, any>>>(shape: T) {
	return new ObjectValidator<T>(shape);
}

import { Pipe, type Context, type Result } from "./pipe";

class EnumValidator<T extends Readonly<Array<string>>> extends Pipe<
	number,
	T[number]
> {
	type = "enum" as const;

	constructor(public values: Readonly<Array<string>>) {
		super();
	}

	isT(data: unknown): data is T[number] {
		return typeof data == "string" && this.values.includes(data);
	}

	decode(data: unknown, ctx: Context = {}): Result<T[number]> {
		const isT = this.isT(data);
		if (!isT) {
			this.addTypeError(ctx, data);
			return { errors: ctx.errors! };
		}

		return { output: data };
	}
}

export function enumm<T extends Readonly<Array<string>>>(
	values: Readonly<Array<string>>,
) {
	return new EnumValidator<T>(values);
}

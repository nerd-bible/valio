import { Pipe } from "./pipe";

type Literal = string | number | boolean | null | undefined;
class LiteralValidator<T extends Literal> extends Pipe<unknown, T> {
	type = "literal" as const;

	constructor(public literal: T) {
		super();
	}

	isT(data: unknown): data is T {
		return data === this.literal;
	}
}

export function literal<T extends Literal>(literal: T) {
	return new LiteralValidator(literal);
}

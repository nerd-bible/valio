import { Pipe } from "./pipe";

class UndefinedValidator extends Pipe<unknown, undefined> {
	type = "undefined" as const;

	isT(data: unknown) {
		return typeof data == "undefined";
	}
}

export function undefined() {
	return new UndefinedValidator();
}

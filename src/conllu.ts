import * as z from "./index";
import { readFileSync } from "node:fs";

export const rowNumber = z.number().min(0);
export const intId = z.codecs.number().min(0);
export const rowId = z.union([
	// Normal integer like 1, 2
	intId,
	// Multiword token like 1-4 or 1.2-4.2
	z
		.string()
		.regex(/[1-9][0-9]*\.\d+-\d+\.\d+/),
]);

export const boolean = z.codecs.boolean({
	true: ["yes", "true"],
	false: ["no", "false"],
});
export const primitive = z.union([z.string(), boolean, z.codecs.number()]);

export function recordConllu(delims = { prop: "|", value: "=" }) {
	return z.codecs.custom(z.string(), z.record(z.string(), primitive), {
		decode(value: string, ctx: z.Context) {
			let success = true;
			const output: Record<string, z.Output<typeof primitive>> = {};
			const length = ctx.jsonPath.length;

			ctx.jsonPath[length] = "";
			for (const cur of value.split(delims.prop)) {
				let [k, v] = cur.split(delims.value);
				if (!k) continue;
				v ??= "";
				ctx.jsonPath[length] = k;
				const decoded = primitive.decode(v, ctx);
				if (decoded.success) output[k] = decoded.output;
				else success = false;
			}
			ctx.jsonPath.pop();

			if (!success) return { success, errors: ctx.errors };
			return { success, output };
		},
		encode(v: Record<string, z.Output<typeof primitive>>) {
			const entries = Object.entries(v);
			if (!entries.length) return { success: true, output: "_" };

			return {
				success: true,
				output: entries
					.map(([k, v]) => `${k}${delims.value}${v}`)
					.join(delims.prop),
			};
		},
	});
}

const word = z.object({
	id: rowId,
	form: z.string(),
	lemma: z.string(),
	upos: z.string(),
	xpos: z.string(),
	feats: recordConllu(),
	head: z.codecs.number(),
	deprel: z.string(),
	deps: recordConllu({ prop: "|", value: ":" }), //.pipe(z.record(rowId, primitive)),
	misc: recordConllu(),
});
// .partial();
const columns = Object.keys(word.shape) as (keyof z.Output<typeof word>)[];

const wordConllu = z.codecs.custom(z.string(), word, {
	decode(v, ctx) {
		const split = v
			.split("\t")
			// spec is unclear what a missing _ means
			// the _ are there for readability in editors that don't show whitespace
			.map((v) => (v == "_" ? "" : v));

		const res = {} as any;
		for (let i = 0; i < columns.length; i++)
			res[columns[i] as (typeof columns)[number]] = split[i];

		return word.decode(res, ctx);
	},
	encode(value) {
		let output = "";
		for (const c of columns) {
			const v = value[c];
			if (v == "") output += "_";
			else {
				const encoded = word.shape[c].encode(v as never);
				if (!encoded.success) return encoded;
				output += encoded.output;
			}
			if (c != "misc") output += "\t";
		}
		return { success: true, output };
	},
});

const sentence = z.object({
	headers: z.record(z.string(), z.union([z.string(), z.undefined()])),
	// .object({
	// 	sent_id: z.string().nonempty(),
	// 	text: z.string().nonempty(),
	// })
	// .catchall(z.union([z.string(), z.undefined()])),
	words: z.array(word),
});

// Makes sure syntax is followed and required fields are included.
export const normal = z.codecs.custom(z.string(), z.array(sentence), {
	decode(str, ctx) {
		const output = [];

		const lines = str.split(/\r?\n/);
		let cur = {
			headers: {},
			words: [],
		} as z.Output<typeof sentence>;
		let parsingHeaders = true;
		const headerPrefix = "# ";

		const length = ctx.jsonPath.length;
		ctx.jsonPath[length] = "";

		for (let i = 0; i < lines.length; i++) {
			ctx.jsonPath[length] = (i + 1).toString();
			const line = lines[i]!;

			if (parsingHeaders && line.startsWith(headerPrefix)) {
				const [k, v] = line.substring(headerPrefix.length).split("=");
				cur.headers[k!.trim()] = v?.trim();
			} else if (line) {
				parsingHeaders = false;
				const decoded = wordConllu.decode(line, ctx);
				if (!decoded.success) return decoded;
				cur.words.push(decoded.output);
			} else if (!parsingHeaders && !line) {
				parsingHeaders = true;
				output.push(cur);
				cur = { headers: {}, words: [] };
			}
		}

		ctx.jsonPath.pop();

		return { success: true, output };
	},
	encode(sentences) {
		let output = "";
		for (const s of sentences) {
			for (const k in s.headers) {
				const v = s.headers[k];

				output += `# ${k.trim()}`;
				if (v) output += ` = ${v.trim()}`;
				output += "\n";
			}

			for (const w of s.words) {
				const encoded = wordConllu.encode(w);
				if (!encoded.success) return encoded;
				output += encoded.output;
				output += "\n";
			}
		}

		return { success: true, output: output };
	},
});

console.dir(
	wordConllu.decode("1	In	in	ADP	IN	_	3	case	_	Verse=1|SourceMap=1"),
	{ depth: null },
);

const text = readFileSync("./test/bsb.conllu", "utf8");
const parsed = normal.decode(text);
console.dir(parsed, { depth: null });
if (parsed.success) {
	const reencoded = normal.encode(parsed.output);
	if (reencoded.success) console.log(reencoded.output);
}

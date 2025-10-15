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
		decode(v: string, ctx: z.Context) {
			if (v == null || v === "_") return { success: true, output: {} };

			const output = v.split(delims.prop).reduce(
				(acc, cur) => {
					const [k, v] = cur.split(delims.value);
					const decoded = primitive.decode(v ?? "", ctx);
					if ("output" in decoded) acc[k as string] = decoded.output;
					return acc;
				},
				{} as Record<string, z.Output<typeof primitive>>,
			);

			return { success: true, output };
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
	feats: z.string(), // recordConllu(),
	head: z.codecs.number(),
	deprel: z.string(),
	deps: z.string(), //recordConllu({ prop: "|", value: ":" }), // .pipe(z.record(rowId, primitive)),
	misc: z.string(), //recordConllu(),
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
	encode(v) {
		return {
			success: true,
			output: columns
				.map((c) => v[c])
				.map((v) => (v == undefined ? "_" : v))
				.join("\t"),
		};
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
		let res = "";
		for (const s of sentences) {
			for (const k in s.headers) {
				const v = s.headers[k];

				res += `# ${k.trim()}`;
				if (v) res += ` = ${v.trim()}`;
				res += "\n";
			}

			res += s.words.join("\n");
		}

		return { success: true, output: res };
	},
});

console.dir(
	wordConllu.decode("1	In	in	ADP	IN	_	3	case	_	Verse=1|SourceMap=1"),
	{ depth: null },
);

const text = readFileSync("./test/bsb.conllu", "utf8");
const parsed = normal.decode(text);
console.dir(parsed, { depth: null });
// console.log(normal.encode(parsed.data!).data);

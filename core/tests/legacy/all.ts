import {
	Free,
	LoggerEffect,
	RandomEffect,
	UseParser,
	UseThrow,
	UseUserInput,
} from "../resource/types/free.ts";
import { R } from "../pure_deps.ts";

export const kaomoji = {
	content: ["૮ ˶ᵔ ᵕ ᵔ˶ ა", "˶ᵔ ᵕ ᵔ˶", "( ˘͈ ᵕ ˘͈♡)", "(⸝⸝ᵕᴗᵕ⸝⸝)"],
	excited: ["⸜(｡˃ ᵕ ˂ )⸝", "◝(ᵔᵕᵔ)◜", "(๑ > ᴗ < ๑)"],
};

export const UseLogger = () => use<LoggerEffect>();
// sig: { log: any => void }
export const UseRandom = () => use<RandomEffect<0, 1>>();
// sig: { rand: () => float }

const UseKaomojiLog = () =>
	UseLogger()
		.chain(UseRandom)
		.extendF((fx) => ({ // Fx1 => Fx2 => Fx1 & Fx2
			cuteLog: (msg: string) =>
				R.pipe(
					fx.rand,
					R.multiply(kaomoji.excited.length),
					Math.floor,
					(n) => kaomoji.excited.at(n),
					String,
					(s) => R.concat(msg, s),
					fx.log,
				)(), // composes log and random to randomly
			// decorate errors with kaomoji
		}));

const divideBy = ([n1, n2]: [number, number]) =>
	UseKaomojiLog() // makes cuteLog available
		.chain(UseThrow<string>)
		.of(n1 / n2)
		.map((n, f) =>
			isNaN(n)
				? f.throw(
					`dont do that please`,
				)
				: n
		)
		.map((n, f) => f.cuteLog(`here's your number: ${n}`));

const main = UseUserInput()
	.chain(UseParser<[number, number]>)
	.map2((f) => f.ask()) // ignores the first argument
	.map((query, f) => f.parse(query))
	.chain(divideBy);

main.run({
	rand: Math.random,
	log: console.log,
	ask: () => prompt() || "",
	parse: (args: string) => args.split(" ").map(Number) as [number, number],
	throw: (e) => {
		throw new Error(e);
	},
});

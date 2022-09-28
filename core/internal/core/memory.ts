import {
	Hours,
	Memory,
	MemoryConstantsReader,
	ParamsReader,
	TimeEffect,
	use,
} from "../../deps.ts";
export const calcLog = (base: number) => (x: number) =>
	Math.log(x) / Math.log(base);

export const fit = (c: Memory) => (recordedAt: Hours, accuracy: number) =>
	use<MemoryConstantsReader>()
		.map2((f) =>
			calcLog(f.readLogBase())(accuracy) / (recordedAt - c.lastSeen)
		);
// is how much it will be adjusted by to avoid noise

export const remodel =
	(flexibility = 0.3) => (estimatedCurve: number, oldDecay: number) =>
		(estimatedCurve * flexibility) + oldDecay * (1 - flexibility);

export const predict = (when: Hours) => (c: Memory) =>
	use<MemoryConstantsReader>()
		.map2((f) =>
			Math.pow(f.readLogBase(), c.decayCurve * (when - c.lastSeen))
		);

export const halfLife = (halfLifeDefinition: number, c: Memory) =>
	use<MemoryConstantsReader>()
		.map2((f) =>
			(-1 * (1 / c.decayCurve)) *
			calcLog(f.readLogBase())(1 / halfLifeDefinition)
		);

export const adjust = (c: Memory) => (accuracy: number) =>
	use<TimeEffect<{ hoursFromEpoch: number }> & ParamsReader>().chain(
		(_, f) => {
			return fit(c)(f.now().hoursFromEpoch, accuracy).map((est) =>
				est > -0.0001
					? -0.000001
					: est < f.params.initialDecay
					? f.params.initialDecay
					: est
			).map((est) => {
				return {
					decayCurve: remodel(
						f.params.flexibility,
					)(
						est,
						c.decayCurve,
					),
					lastSeen: f.now().hoursFromEpoch,
				};
			});
		},
	);

const _test = () => {
	const m = { lastSeen: -0.5, decayCurve: -0.5 };
	console.log(fit(m)(0, 0.8));
};
//_test()
// y = e^{-0.3x} - (hoursSinceLastSeen)

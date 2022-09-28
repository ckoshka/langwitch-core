import { ParamsReader } from "../deps.ts";

export const implParams = (startTimestamp: number) =>
	<ParamsReader> {
		params: ({
			maxLearnable: 3,
			maxPerSession: 245,
			maxConsiderationSize: 7,
			flexibility: 0.09,
			initialDecay: -0.5,
			knownThreshold: -0.4,
			metadata: {
				startTimestamp,
			},
		}),
	};

import { Free, MarkedResult, State } from "../../deps.ts";
import { checkGraduation } from "./check_graduation.ts";
import { markAndUpdate, updateTopContext } from "./handle_feedback.ts";
import { refresh } from "./handle_refresh.ts";

export const handleSessionRefresh = (s1: State) =>
	refresh(s1.db).chain((s2) => checkGraduation(s2)).chain((s3) =>
		updateTopContext(s3)
	);

export const nextState = (s1: State) => (feedback: MarkedResult) =>
	markAndUpdate(s1)(feedback)
		.chain((s2) => checkGraduation(s2))
		.chain((s3) => updateTopContext(s3))
		.chain((s4, f) => {
			if (
				s4.noMoreLearnablesLeft ||
				s4.stats.learnCount >=
					f.params.maxPerSession - 10
			) {
				return handleSessionRefresh(s4);
			} else return Free.lift(s4) as never;
		});

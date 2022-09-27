import { Free } from "../../deps.ts";
import { Feedback } from "../shared-types/feedback.ts";
import { checkGraduation } from "./check_graduation.ts";
import { markAndUpdate, updateTopContext } from "./handle_feedback.ts";
import { refresh } from "./handle_refresh.ts";
import { State } from "./types/state.ts";

export const handleSessionRefresh = <Meta>(s1: State<Meta>) =>
	refresh(s1.db).chain((s2) => checkGraduation<Meta>(s2)).chain((s3) =>
		updateTopContext<Meta>(s3)
	);

export const nextState = <Meta>(s1: State<Meta>) =>
	(feedback: Feedback) =>
		markAndUpdate<Meta>(s1)(feedback)
			.chain((s2) => checkGraduation<Meta>(s2))
			.chain((s3) => updateTopContext(s3))
			.chain((s4, f) => {
				if (
					s4.noMoreLearnablesLeft ||
					s4.stats.learnCount >=
						f.params.maxPerSession - 10
				) {
					return handleSessionRefresh<Meta>(s4);
				} else return Free.lift(s4) as never;
			});

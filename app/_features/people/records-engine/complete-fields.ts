import { evaluatePersonProfileFields } from "@/app/_features/plays/playbooks/profile/apply-person-profile";
import type { CompletePersonFieldsInput } from "./types";

export function completePersonFields(input: CompletePersonFieldsInput) {
  return evaluatePersonProfileFields(input);
}

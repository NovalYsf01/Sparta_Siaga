import assert from "node:assert/strict";
import { getInitialWorkflowAction } from "../lib/report-workflow-presentation";

assert.equal(getInitialWorkflowAction("tim_toko", "field_inspection_required"), "INSPECT");
assert.equal(getInitialWorkflowAction("tim_toko", "clarification_required"), "INSPECT");
assert.equal(getInitialWorkflowAction("tim_toko", "awaiting_manager_confirmation"), "NONE");
assert.equal(getInitialWorkflowAction("bm", "awaiting_manager_confirmation"), "CONFIRM");
assert.equal(getInitialWorkflowAction("bm", "field_inspection_required"), "NONE");
assert.equal(getInitialWorkflowAction("ho_admin", "awaiting_manager_confirmation"), "NONE");

console.log("report workflow presentation tests: PASS");

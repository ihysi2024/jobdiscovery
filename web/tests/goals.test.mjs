import { test } from "node:test";
import assert from "node:assert/strict";
import { goalText } from "../src/lib/goals.mjs";

test("goal text from dreams, own words and horizons, anchored to their field", () => {
  const t = goalText({ dreams: ["research", "care", "family"], own: "Run a lab someday", horizons: { y5: "Managing a team", y1: "Still exploring", y3: "The go-to expert on something" } },
                     { headline: "Research Associate, Biotech" });
  assert.match(t, /^Work I want to do: research, science and discovery.*caring for people/);
  assert.doesNotMatch(t, /family/);              // lifestyle, used as a priority instead
  assert.match(t, /Run a lab someday/);
  assert.match(t, /In 3 years: The go-to expert on something\. In 5 years: Managing a team/);
  assert.doesNotMatch(t, /Still exploring/);
  assert.match(t, /Field: Research Associate, Biotech$/);
});

test("switching fields isn't anchored to the current one; nothing to go on gives empty", () => {
  assert.doesNotMatch(goalText({ horizons: { y1: "Settled into a new field" } }, { headline: "Paralegal" }), /Paralegal/);
  assert.equal(goalText({ dreams: ["travel"], horizons: { y1: "Still exploring" } }, null), "");
  assert.equal(goalText(null, null), "");
});

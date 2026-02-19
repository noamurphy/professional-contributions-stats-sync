import assert from "assert";
import { parse } from "node-html-parser";
import {
  getContributionCount,
  getContributionDays,
  hasContributionCells,
} from "../src/index.js";

const run = (name, fn) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
};

run("parses counts from tooltip text on current table-cell markup", () => {
  const doc = parse(`
    <table>
      <tr>
        <td id="contribution-day-component-0-1" class="ContributionCalendar-day" data-date="2025-01-05"></td>
      </tr>
    </table>
    <tool-tip for="contribution-day-component-0-1">4 contributions on January 5th.</tool-tip>
  `);
  const days = getContributionDays(doc);
  assert.strictEqual(days.length, 1);
  assert.deepStrictEqual(days[0], { date: "2025-01-05", count: 4 });
});

run("parses counts from rect data-count markup", () => {
  const doc = parse(`
    <svg>
      <rect class="ContributionCalendar-day" data-date="2025-02-01" data-count="7"></rect>
    </svg>
  `);
  const days = getContributionDays(doc);
  assert.strictEqual(days.length, 1);
  assert.deepStrictEqual(days[0], { date: "2025-02-01", count: 7 });
});

run("detects valid calendar cells even with zero contributions", () => {
  const doc = parse(`
    <table>
      <tr>
        <td id="contribution-day-component-0-2" class="ContributionCalendar-day" data-date="2025-01-12"></td>
      </tr>
    </table>
    <tool-tip for="contribution-day-component-0-2">No contributions on January 12th.</tool-tip>
  `);
  assert.strictEqual(hasContributionCells(doc), true);
  assert.strictEqual(getContributionDays(doc).length, 0);
});

run("reads one-contribution grammar from tooltip", () => {
  const doc = parse(`
    <td id="one" class="ContributionCalendar-day" data-date="2025-03-03"></td>
    <tool-tip for="one">1 contribution on March 3rd.</tool-tip>
  `);
  const el = doc.querySelector("#one");
  assert.strictEqual(getContributionCount(doc, el), 1);
});

console.log("All parser tests passed.");

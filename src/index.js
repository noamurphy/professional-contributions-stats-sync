import { parse } from "node-html-parser";
import axios from "axios";
import fs from "fs";
import shell from "shelljs";

// Gathers needed git commands for bash to execute per provided contribution data.
const getCommand = (contribution) => {
  return `GIT_AUTHOR_DATE="${contribution.date}T12:00:00" GIT_COMMITTER_DATE="${contribution.date}T12:00:00" git commit --allow-empty -m "Rewriting History!" > /dev/null\n`.repeat(
    contribution.count
  );
};

export const getContributionCount = (document, el) => {
  const dataCount = parseInt(el.getAttribute("data-count"), 10);
  if (!isNaN(dataCount)) return dataCount;

  const ariaLabel = el.getAttribute("aria-label") || "";
  const ariaMatch = ariaLabel.match(/(\d+)\s+contribution/i);
  if (ariaMatch) return parseInt(ariaMatch[1], 10);

  const id = el.getAttribute("id");
  if (id) {
    const tooltipData = document.querySelector(`tool-tip[for="${id}"]`);
    const tooltipText = tooltipData ? tooltipData.textContent : "";
    const tooltipMatch = tooltipText.match(/(\d+)\s+contribution/i);
    if (tooltipMatch) return parseInt(tooltipMatch[1], 10);
  }

  return 0;
};

export const getContributionDays = (document) => {
  const elements = document.querySelectorAll(
    'rect[data-date], td.ContributionCalendar-day, rect.ContributionCalendar-day'
  );

  return elements
    .map((el) => ({
      date: el.getAttribute("data-date"),
      count: getContributionCount(document, el),
    }))
    .filter((day) => day.date && day.count > 0);
};

export const hasContributionCells = (document) => {
  return (
    document.querySelectorAll(
      'rect[data-date], td.ContributionCalendar-day, rect.ContributionCalendar-day'
    ).length > 0
  );
};

const fetchContributionDocument = async (input) => {
  const from = `${input.year}-01-01`;
  const to = `${input.year}-12-31`;
  const urls = [
    `https://github.com/users/${input.username}/contributions?from=${from}&to=${to}`,
    `https://github.com/${input.username}?tab=overview&from=${from}&to=${to}`,
  ];

  for (const url of urls) {
    const res = await axios.get(url);
    const document = parse(res.data);
    if (hasContributionCells(document)) return document;
  }

  throw new Error("Could not parse contribution data from GitHub response.");
};

export default async (input) => {
  const document = await fetchContributionDocument(input);
  const filteredDays = getContributionDays(document);

  // Create a script based on the filtered contributions.
  const script = filteredDays
    .map((contribution) => getCommand(contribution))
    .join("\n")
    .concat("git pull origin main\n", "git push -f origin main");

  // Write the script to a file.
  fs.writeFile("script.sh", script, () => {
    console.log("\nFile was created successfully.");

    // Optionally execute the script if the input flag is set.
    if (input.execute) {
      console.log("This might take a moment!\n");
      shell.exec("sh ./script.sh");
    }
  });
};

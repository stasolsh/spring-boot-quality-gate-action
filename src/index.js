const core = require("@actions/core");
const exec = require("@actions/exec");
const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

async function run() {
  try {
    const threshold = Number(core.getInput("coverage-threshold"));
    const buildToolInput = core.getInput("build-tool");
    const workingDirectory = core.getInput("working-directory");

    process.chdir(workingDirectory);

    const buildTool = detectBuildTool(buildToolInput);

    core.info(`Using build tool: ${buildTool}`);

    await runTests(buildTool);

    const reportPath = findJacocoReport();
    if (!reportPath) {
      core.setFailed("JaCoCo report not found. Expected target/site/jacoco/jacoco.xml or build/reports/jacoco/test/jacocoTestReport.xml");
      return;
    }

    core.info(`Found JaCoCo report: ${reportPath}`);

    const coverage = calculateCoverage(reportPath);

    core.setOutput("coverage", coverage.toFixed(2));

    core.info(`Line coverage: ${coverage.toFixed(2)}%`);
    core.info(`Required threshold: ${threshold}%`);

    await writeSummary(coverage, threshold, reportPath);

    if (coverage < threshold) {
      core.setFailed(`Coverage ${coverage.toFixed(2)}% is below threshold ${threshold}%`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

function detectBuildTool(input) {
  if (input === "maven" || input === "gradle") {
    return input;
  }

  if (fs.existsSync("mvnw") || fs.existsSync("pom.xml")) {
    return "maven";
  }

  if (fs.existsSync("gradlew") || fs.existsSync("build.gradle") || fs.existsSync("build.gradle.kts")) {
    return "gradle";
  }

  throw new Error("Could not detect build tool. Use build-tool: maven or build-tool: gradle");
}

async function runTests(buildTool) {
  if (buildTool === "maven") {
    const command = fs.existsSync("mvnw") ? "./mvnw" : "mvn";
    await exec.exec(command, ["clean", "test", "jacoco:report"]);
    return;
  }

  if (buildTool === "gradle") {
    const command = fs.existsSync("gradlew") ? "./gradlew" : "gradle";
    await exec.exec(command, ["clean", "test", "jacocoTestReport"]);
    return;
  }

  throw new Error(`Unsupported build tool: ${buildTool}`);
}

function findJacocoReport() {
  const possiblePaths = [
    "target/site/jacoco/jacoco.xml",
    "build/reports/jacoco/test/jacocoTestReport.xml"
  ];

  return possiblePaths.find((filePath) => fs.existsSync(filePath));
}

function calculateCoverage(reportPath) {
  const xml = fs.readFileSync(reportPath, "utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ""
  });

  const report = parser.parse(xml);

  const counters = Array.isArray(report.report.counter)
    ? report.report.counter
    : [report.report.counter];

  const lineCounter = counters.find((counter) => counter.type === "LINE");

  if (!lineCounter) {
    throw new Error("LINE counter not found in JaCoCo report");
  }

  const missed = Number(lineCounter.missed);
  const covered = Number(lineCounter.covered);
  const total = missed + covered;

  if (total === 0) {
    return 0;
  }

  return (covered / total) * 100;
}

async function writeSummary(coverage, threshold, reportPath) {
  const status = coverage >= threshold ? "PASSED" : "FAILED";

  await core.summary
    .addHeading("Spring Boot Quality Gate")
    .addTable([
      [
        { data: "Metric", header: true },
        { data: "Value", header: true }
      ],
      ["Coverage", `${coverage.toFixed(2)}%`],
      ["Threshold", `${threshold}%`],
      ["Status", status],
      ["Report", reportPath]
    ])
    .write();
}

if (require.main === module) {
  run();
}

module.exports = {
  detectBuildTool,
  findJacocoReport,
  calculateCoverage
};
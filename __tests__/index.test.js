const fs = require("fs");
const path = require("path");
const {
  detectBuildTool,
  findJacocoReport,
  calculateCoverage
} = require("../src/index");

describe("detectBuildTool", () => {
  afterEach(() => {
    ["pom.xml", "build.gradle", "gradlew", "mvnw"].forEach(file => {
      if (fs.existsSync(file)) fs.rmSync(file);
    });
  });

  test("returns maven when input is maven", () => {
    expect(detectBuildTool("maven")).toBe("maven");
  });

  test("returns gradle when input is gradle", () => {
    expect(detectBuildTool("gradle")).toBe("gradle");
  });

  test("detects gradle from build.gradle", () => {
    fs.writeFileSync("build.gradle", "");
    expect(detectBuildTool("auto")).toBe("gradle");
  });

  test("detects maven from pom.xml", () => {
    fs.writeFileSync("pom.xml", "");
    expect(detectBuildTool("auto")).toBe("maven");
  });
});

describe("findJacocoReport", () => {
  afterEach(() => {
    if (fs.existsSync("target")) fs.rmSync("target", { recursive: true, force: true });
    if (fs.existsSync("build")) fs.rmSync("build", { recursive: true, force: true });
  });

  test("finds Gradle JaCoCo report", () => {
    const reportPath = "build/reports/jacoco/test";
    fs.mkdirSync(reportPath, { recursive: true });
    fs.writeFileSync(path.join(reportPath, "jacocoTestReport.xml"), "<report></report>");

    expect(findJacocoReport()).toBe("build/reports/jacoco/test/jacocoTestReport.xml");
  });
});

describe("calculateCoverage", () => {
  test("calculates line coverage from JaCoCo XML", () => {
    const xml = `
      <report>
        <counter type="LINE" missed="20" covered="80"/>
      </report>
    `;

    fs.writeFileSync("jacoco.xml", xml);

    expect(calculateCoverage("jacoco.xml")).toBe(80);

    fs.rmSync("jacoco.xml");
  });
});
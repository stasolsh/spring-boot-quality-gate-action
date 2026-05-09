# Spring Boot Quality Gate Action

GitHub Action for Java/Spring Boot projects.

## Features

- Detects Maven or Gradle
- Runs tests
- Generates JaCoCo report
- Reads line coverage
- Fails workflow if coverage is below threshold
- Adds GitHub Actions job summary

## Usage

```yaml
- uses: stasolsh/spring-boot-quality-gate-action@v1
  with:
    coverage-threshold: 80
    build-tool: auto
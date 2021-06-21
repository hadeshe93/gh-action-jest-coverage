const execa = require('execa');
const path = require('path');
const branch = 'HEAD';
const testCommand = 'npm test --';
// const testCommand = 'jest';

execa
  .command(`git diff --name-only remotes/origin/main...${branch} | grep .js$`)
  .then(({ stdout, stderr }) => {
    if (stderr) {
      throw new Error(stderr);
    }
    return stdout.replace(/\n/g, ' ');
  })
  .then((changedFiles) =>
    execa.command(`${testCommand} --listTests --findRelatedTests ${changedFiles}`).then(({ stdout, stderr }) => {
      if (stderr) {
        throw new Error(stderr);
      }
      return {
        changedFiles: changedFiles.split(' '),
        relatedTests: JSON.parse(stdout),
      };
    }),
  )
  .then((ctx) => {
    if (ctx.relatedTests.length < 1) {
      // wow, nothing to test!
      return;
    }
    const collectCoverageFrom = ctx.changedFiles.map((from) => `--collectCoverageFrom "${from}"`).join(' ');
    const testFiles = ctx.relatedTests.map((testFile) => path.relative(process.cwd(), testFile)).join(' ');
    const coverageCommand = `${testCommand} --coverage ${collectCoverageFrom} ${testFiles}`;
    return execa.command(coverageCommand, { stdio: 'inherit' }).catch(() => {
      process.exitCode = 1;
    });
  });

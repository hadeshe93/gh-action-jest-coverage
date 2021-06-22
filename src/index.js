const execa = require('execa');
const core = require('@actions/core');
const path = require('path');
const testCommand = 'npx jest';
const isEnvDevelopment = process.env.NODE_ENV === 'development';
const whiteListRegs = [/\.(j|t)s(x)?$/, /\.vue$/];
const blackListRegs = [
  /\.test\.js$/,
  /\.spec\.js$/,
  /\.eslintrc\.js$/,
  /\.lintstagedrc\.js$/,
  /commitlint\.config\.js$/,
  /babel\.config\.js$/,
  /jest\.config\.js$/,
];

(async () => {
  // 准备入参变量
  const sourceBranch = core.getInput('source-branch') || 'HEAD';
  const targetBranch = core.getInput('target-branch') || 'remotes/origin/main';

  try {
    const diffCommand = isEnvDevelopment
      ? `git diff --name-only`
      : `git diff --name-only ${targetBranch}...${sourceBranch}`;
    // 获取变更的文件列表
    const { stdout: stdoutChangedFiles, stderr: stderrChangedFiles } = await execa.command(diffCommand);
    if (stderrChangedFiles) throw new Error(stderrChangedFiles);
    const changedFiles = (stdoutChangedFiles.split('\n') || []).filter((file) => {
      // 需要同时满足在白名单以及不在黑名单
      return Boolean(whiteListRegs.find((reg) => reg.test(file))) && !blackListRegs.find((reg) => reg.test(file));
    });
    core.info('Changed files: ');
    core.info(JSON.stringify(changedFiles, undefined, 2));
    core.info('\n');

    // 获取与变更文件相关的单元测试文件
    const res = await execa.command(`${testCommand} --listTests --findRelatedTests ${changedFiles.join(' ')}`);
    const { stdout: stdoutRelTests, stderr: stderrRelTests } = res;
    if (stderrRelTests) throw new Error(stderrRelTests);
    const relatedTests = (stdoutRelTests.split('\n') || []).filter((file) => Boolean(file));
    if (relatedTests.length < 1) {
      core.setFailed('相关单元测试用例数为 0');
      return false;
    }
    core.info('Related test files: ');
    core.info(JSON.stringify(relatedTests, undefined, 2));
    core.info('\n');

    // 将变更文件和对应的测试文件进行关联并执行单测，计算增量覆盖率
    const collectCoverageFrom = changedFiles.map((file) => `--collectCoverageFrom "${file}"`).join(' ');
    const testFiles = relatedTests.map((testFile) => path.relative(process.cwd(), testFile)).join(' ');
    const coverageCommand = `${testCommand} --coverage ${collectCoverageFrom} ${testFiles}`;
    await execa.command(coverageCommand, { stdio: 'inherit' });
  } catch (error) {
    core.setFailed(error.message);
    return false;
  }
})();
